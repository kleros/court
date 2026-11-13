import { invalid, succeed, unavailable } from "./outcome.ts";
import { KERNEL_INVALID } from "./reasons.ts";
import type { FetchRequest, FetchResponse, Fetcher, Outcome } from "./types.ts";

const TOO_LARGE = KERNEL_INVALID[0];
const NOT_JSON = KERNEL_INVALID[1];

// The abort reasons this fetcher gives its own signal; the first one wins (AbortController ignores later calls).
const TIMEOUT = "timeout";
const CANCELLED = "cancelled";

const ignore = (): undefined => undefined;

/**
 * Every request ends: at `timeoutMs` (body read included), at the caller's abort, or past `maxBytes` (declared or
 * streamed). Past the cap a 2xx answer is invalid "too-large"; any other status comes back ok with its status and no
 * body, so an oversized error page still reads as an error answer (an outage), never as bad content. A stop cancels
 * the body, also one that arrives after it. Failure messages never repeat the URL: configured URLs can carry API keys,
 * as csp.ts notes for RPC URLs.
 */
export function createFetcher(fetchImpl: typeof globalThis.fetch): Fetcher {
  return async (request) => {
    if (request.signal?.aborted === true) return stopFailure(CANCELLED, request);
    const controller = new AbortController();
    const { signal } = controller;
    const onCallerAbort = (): void => {
      controller.abort(CANCELLED);
    };
    request.signal?.addEventListener("abort", onCallerAbort, { once: true });
    const timer = setTimeout(() => {
      controller.abort(TIMEOUT);
    }, request.timeoutMs);
    // A synchronous throw from fetchImpl becomes a rejection, like any network error.
    const pending = (async () =>
      fetchImpl(request.url, {
        method: request.method ?? "GET",
        headers: request.headers,
        body: request.body,
        signal,
        // Only when asked: every other request keeps fetch's default cache mode (§25.5).
        ...(request.cache === undefined ? {} : { cache: request.cache }),
      }))();
    try {
      const outcome = await answer(pending, request, signal);
      // A stop during the body read ends it early (readBody cancels the reader): that short answer is the stop.
      if (!signal.aborted) return outcome;
    } catch {
      // Once stopped, whatever failed (the wait, or a fetch or body ended by the abort) is that stop.
      if (!signal.aborted) return unavailable("network", "The request failed before a complete answer arrived.");
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onCallerAbort);
    }
    // A fetch that ignores its signal can still deliver a response after the stop: its body is cancelled unread.
    void pending.then((late) => late.body?.cancel()).catch(ignore);
    return stopFailure(signal.reason, request);
  };
}

async function answer(
  pending: Promise<Response>,
  request: FetchRequest,
  signal: AbortSignal,
): Promise<Outcome<FetchResponse>> {
  const response = await Promise.race([pending, untilStopped(signal)]);
  // An answer that was already there can win that race against a stop made in the same moment; the stop still counts.
  signal.throwIfAborted();
  const headers = headersOf(response.headers);
  // No body is read for HEAD: its Content-Length is the size of the resource, not of a body.
  if (request.method === "HEAD" || response.body === null) {
    return succeed({ status: response.status, headers, bytes: new Uint8Array() });
  }
  if (Number(headers["content-length"] ?? "") > request.maxBytes) {
    void response.body.cancel().catch(ignore);
    return overCap(response, headers, request.maxBytes);
  }
  const bytes = await readBody(response.body, request.maxBytes, signal);
  return bytes === TOO_LARGE
    ? overCap(response, headers, request.maxBytes)
    : succeed({ status: response.status, headers, bytes });
}

/** Rejects at the first stop, so the wait for headers ends even when the injected fetch ignores its signal. */
function untilStopped(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener(
      "abort",
      () => {
        reject(new Error("stopped"));
      },
      { once: true },
    );
  });
}

function stopFailure(reason: unknown, request: FetchRequest): Outcome<never> {
  return reason === TIMEOUT
    ? unavailable("timeout", `No complete answer within ${request.timeoutMs} ms.`)
    : unavailable("aborted", "The request was cancelled.");
}

/** A 2xx body past the cap is bad content. An error answer is the caller's to classify, so it keeps its status. */
function overCap(response: Response, headers: Record<string, string>, maxBytes: number): Outcome<FetchResponse> {
  return response.ok
    ? invalid(TOO_LARGE, `The answer is larger than ${maxBytes} bytes.`)
    : succeed({ status: response.status, headers, bytes: new Uint8Array() });
}

/** Names come lowercase from Headers. fromEntries defines own properties, so a header named __proto__ stays a header. */
function headersOf(headers: Headers): Record<string, string> {
  const entries: [string, string][] = [];
  headers.forEach((value, name) => {
    entries.push([name, value]);
  });
  return Object.fromEntries(entries);
}

/**
 * The body, copied into one buffer as it arrives, so memory follows the byte count (at most about twice `maxBytes`),
 * never the number of chunks; "too-large" (download cancelled) past the cap. A stop cancels the read, which then ends
 * as done; the caller checks the signal.
 */
async function readBody(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array | typeof TOO_LARGE> {
  const reader = body.getReader();
  const cancel = (): void => {
    void reader.cancel().catch(ignore);
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    let buffer = new Uint8Array(0);
    let total = 0;
    for (;;) {
      const next = await reader.read();
      if (next.done) return buffer.slice(0, total);
      const end = total + next.value.byteLength;
      if (end > maxBytes) {
        cancel();
        return TOO_LARGE;
      }
      if (end > buffer.byteLength) {
        // Doubling keeps the number of copies small; the cap was checked above, so it is never passed.
        const grown = new Uint8Array(Math.min(maxBytes, Math.max(end, 2 * buffer.byteLength)));
        grown.set(buffer.subarray(0, total));
        buffer = grown;
      }
      buffer.set(next.value, total);
      total = end;
    }
  } finally {
    reader.releaseLock();
  }
}

/** UTF-8, non-fatal: bad bytes become U+FFFD and a leading BOM is dropped, as `Response.text()` does. */
export function textOf(response: FetchResponse): string {
  return new TextDecoder().decode(response.bytes);
}

export function jsonOf(response: FetchResponse): Outcome<unknown> {
  try {
    return succeed(JSON.parse(textOf(response)) as unknown);
  } catch {
    return invalid(NOT_JSON, "The answer is not JSON.");
  }
}
