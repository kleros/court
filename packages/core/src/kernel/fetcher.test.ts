import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFetcher, jsonOf, textOf } from "./fetcher.ts";
import type { FetchRequest, FetchResponse, Outcome } from "./types.ts";

type FetchImpl = typeof globalThis.fetch;

const URL_WITH_KEY = "https://gateway.example/api/SECRET-KEY/subgraphs/x";
const request: FetchRequest = { url: URL_WITH_KEY, timeoutMs: 1000, maxBytes: 8 };

/** A fake fetch answering `respond`, recording what it was asked. */
function fakeFetch(respond: (init: RequestInit | undefined) => Promise<Response>) {
  const calls: { input: unknown; init: RequestInit | undefined }[] = [];
  const fetchImpl: FetchImpl = (input, init) => {
    calls.push({ input, init });
    return respond(init);
  };
  return { fetchImpl, calls };
}

/** Like a browser's fetch: never answers on its own, rejects when its signal aborts. */
function waitsForAbort(init: RequestInit | undefined): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      reject(new DOMException("The operation was aborted.", "AbortError"));
    });
  });
}

function body(chunks: number[][], onCancel?: () => void): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new Uint8Array(chunk));
      controller.close();
    },
    cancel: onCancel,
  });
}

/** Sends one chunk, then nothing, forever (and ignores any abort: only the fetcher's own clock can end it). */
function endlessBody(onCancel?: () => void): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1]));
    },
    cancel: onCancel,
  });
}

function failure<T>(outcome: Outcome<T>) {
  if (outcome.ok) throw new Error("expected a failure");
  return outcome.failure;
}

function value<T>(outcome: Outcome<T>): T {
  if (!outcome.ok) throw new Error(`expected ok, got ${outcome.failure.kind}`);
  return outcome.value;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // Every exit path clears the request's clock.
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
});

describe("createFetcher: answers", () => {
  it("returns status, lowercase headers and the body bytes", async () => {
    const { fetchImpl } = fakeFetch(() =>
      Promise.resolve(new Response(body([[1, 2], [3]]), { status: 200, headers: { "Content-Type": "text/plain" } })),
    );
    const response = value(await createFetcher(fetchImpl)(request));
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/plain");
    expect([...response.bytes]).toEqual([1, 2, 3]);
  });

  it.each([204, 301, 404, 429, 500, 503])("returns HTTP %i as ok with its body: the caller decides", async (status) => {
    const { fetchImpl } = fakeFetch(() => Promise.resolve(new Response(status === 204 ? null : "x", { status })));
    const response = value(await createFetcher(fetchImpl)(request));
    expect(response.status).toBe(status);
    expect(textOf(response)).toBe(status === 204 ? "" : "x");
  });

  it("forwards method, headers and body, GET by default, with its own abort signal", async () => {
    const { fetchImpl, calls } = fakeFetch(() => Promise.resolve(new Response("")));
    const fetcher = createFetcher(fetchImpl);
    await fetcher(request);
    await fetcher({ ...request, method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect(calls[0]?.input).toBe(URL_WITH_KEY);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
    expect(calls[1]?.init).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  });

  it("keeps a header named __proto__ as a header", async () => {
    const { fetchImpl } = fakeFetch(() => Promise.resolve(new Response("", { headers: [["__proto__", "x"]] })));
    const response = value(await createFetcher(fetchImpl)(request));
    expect(Object.hasOwn(response.headers, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(response.headers)).toBe(Object.prototype);
  });
});

describe("createFetcher: byte cap", () => {
  it("accepts a body of exactly maxBytes", async () => {
    const { fetchImpl } = fakeFetch(() =>
      Promise.resolve(
        new Response(
          body([
            [1, 2, 3, 4],
            [5, 6, 7, 8],
          ]),
        ),
      ),
    );
    expect(value(await createFetcher(fetchImpl)(request)).bytes.byteLength).toBe(8);
  });

  it("refuses a declared length over the cap without reading the body", async () => {
    const onCancel = vi.fn();
    const { fetchImpl } = fakeFetch(() =>
      Promise.resolve(new Response(body([[1]], onCancel), { headers: { "content-length": "9" } })),
    );
    const outcome = await createFetcher(fetchImpl)(request);
    expect(failure(outcome)).toMatchObject({ kind: "invalid", reason: "too-large" });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("refuses a body that streams past the cap, declared length absent or smaller (compressed)", async () => {
    const declared: Record<string, string>[] = [{}, { "content-length": "4" }];
    for (const headers of declared) {
      const onCancel = vi.fn();
      const { fetchImpl } = fakeFetch(() =>
        Promise.resolve(new Response(body([[1, 2, 3, 4, 5], [6, 7, 8, 9], [10]], onCancel), { headers })),
      );
      const outcome = await createFetcher(fetchImpl)(request);
      expect(failure(outcome)).toMatchObject({ kind: "invalid", reason: "too-large" });
      expect(onCancel).toHaveBeenCalledOnce();
    }
  });

  it("an error answer over the cap keeps its status, without its body, declared or streamed", async () => {
    const declared: Record<string, string>[] = [{ "content-length": "9" }, {}];
    for (const headers of declared) {
      const onCancel = vi.fn();
      const { fetchImpl } = fakeFetch(() =>
        Promise.resolve(new Response(body([[1, 2, 3, 4, 5], [6, 7, 8, 9], [10]], onCancel), { status: 503, headers })),
      );
      const response = value(await createFetcher(fetchImpl)(request));
      expect(response.status).toBe(503);
      expect(response.bytes.byteLength).toBe(0);
      expect(onCancel).toHaveBeenCalledOnce();
    }
  });

  it("reads no body for HEAD: its Content-Length is the resource's size, not a body", async () => {
    // A readable body, so the method alone decides (Node's fetch gives HEAD a null body).
    const { fetchImpl } = fakeFetch(() =>
      Promise.resolve(
        new Response(body([[1, 2, 3]]), { headers: { "content-length": "50000000", "content-type": "text/html" } }),
      ),
    );
    const response = value(await createFetcher(fetchImpl)({ ...request, method: "HEAD", maxBytes: 0 }));
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.bytes.byteLength).toBe(0);
  });
});

describe("createFetcher: chunking", () => {
  it("reads a body sent as many 1-byte and empty chunks, counting the cap in bytes", async () => {
    const chunks: number[][] = [];
    for (let i = 0; i < 2000; i++) chunks.push([i % 256], []);
    const exact = fakeFetch(() => Promise.resolve(new Response(body(chunks))));
    expect([...value(await createFetcher(exact.fetchImpl)({ ...request, maxBytes: 2000 })).bytes]).toEqual(
      chunks.flat(),
    );
    const onCancel = vi.fn();
    const over = fakeFetch(() => Promise.resolve(new Response(body(chunks, onCancel))));
    const outcome = await createFetcher(over.fetchImpl)({ ...request, maxBytes: 1999 });
    expect(failure(outcome)).toMatchObject({ kind: "invalid", reason: "too-large" });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("keeps no chunk it was given: each is copied at once, so a source that reuses its buffer still reads right", async () => {
    // Holding chunks would cost memory per chunk, not per byte.
    const reused = new Uint8Array(1);
    let sent = 0;
    const source = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (sent === 3) {
            controller.close();
            return;
          }
          sent += 1;
          reused[0] = sent;
          controller.enqueue(reused);
        },
      },
      { highWaterMark: 0 },
    );
    const { fetchImpl } = fakeFetch(() => Promise.resolve(new Response(source)));
    expect([...value(await createFetcher(fetchImpl)(request)).bytes]).toEqual([1, 2, 3]);
  });
});

describe("createFetcher: never rejects", () => {
  it("network error -> unavailable network, without the URL in the message", async () => {
    const { fetchImpl } = fakeFetch(() => Promise.reject(new TypeError(`Failed to fetch ${URL_WITH_KEY}`)));
    const found = failure(await createFetcher(fetchImpl)(request));
    expect(found).toMatchObject({ kind: "unavailable", reason: "network" });
    expect(found.message).not.toContain("SECRET-KEY");
  });

  it("a fetch that throws synchronously -> unavailable network", async () => {
    const fetchImpl: FetchImpl = () => {
      throw new TypeError(`Failed to parse URL from ${URL_WITH_KEY}`);
    };
    const found = failure(await createFetcher(fetchImpl)(request));
    expect(found).toMatchObject({ kind: "unavailable", reason: "network" });
    expect(found.message).not.toContain("SECRET-KEY");
  });

  it("a body that breaks mid-stream -> unavailable network", async () => {
    const broken = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new TypeError("connection reset"));
      },
    });
    const { fetchImpl } = fakeFetch(() => Promise.resolve(new Response(broken)));
    expect(failure(await createFetcher(fetchImpl)(request))).toMatchObject({ kind: "unavailable", reason: "network" });
  });
});

describe("createFetcher: timeout and abort", () => {
  it("no answer within timeoutMs -> unavailable timeout, and the request is aborted", async () => {
    const { fetchImpl, calls } = fakeFetch(waitsForAbort);
    const pending = createFetcher(fetchImpl)(request);
    await vi.advanceTimersByTimeAsync(999);
    expect(calls[0]?.init?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const found = failure(await pending);
    expect(found).toMatchObject({ kind: "unavailable", reason: "timeout" });
    expect(found.message).not.toContain("SECRET-KEY");
    expect(calls[0]?.init?.signal?.aborted).toBe(true);
  });

  it("the timeout holds even when the fetch ignores its signal", async () => {
    const { fetchImpl } = fakeFetch(() => new Promise<Response>(() => undefined));
    const pending = createFetcher(fetchImpl)(request);
    await vi.advanceTimersByTimeAsync(1000);
    expect(failure(await pending)).toMatchObject({ kind: "unavailable", reason: "timeout" });
  });

  it("the timeout covers the body read", async () => {
    const { fetchImpl } = fakeFetch(() => Promise.resolve(new Response(endlessBody())));
    const pending = createFetcher(fetchImpl)(request);
    await vi.advanceTimersByTimeAsync(1000);
    expect(failure(await pending)).toMatchObject({ kind: "unavailable", reason: "timeout" });
  });

  it("the caller's abort -> unavailable aborted, before or during the body", async () => {
    for (const respond of [waitsForAbort, () => Promise.resolve(new Response(endlessBody()))]) {
      const caller = new AbortController();
      const { fetchImpl } = fakeFetch(respond);
      const pending = createFetcher(fetchImpl)({ ...request, signal: caller.signal });
      await vi.advanceTimersByTimeAsync(10);
      caller.abort();
      expect(failure(await pending)).toMatchObject({ kind: "unavailable", reason: "aborted" });
    }
  });

  it("a signal already aborted -> unavailable aborted, nothing requested", async () => {
    const { fetchImpl, calls } = fakeFetch(() => Promise.resolve(new Response("")));
    const outcome = await createFetcher(fetchImpl)({ ...request, signal: AbortSignal.abort() });
    expect(failure(outcome)).toMatchObject({ kind: "unavailable", reason: "aborted" });
    expect(calls).toHaveLength(0);
  });

  it("a stop cancels the body and lets go of it, even when the fetch ignores its signal", async () => {
    for (const stop of ["timeout", "aborted"] as const) {
      const onCancel = vi.fn();
      const stream = endlessBody(onCancel);
      const caller = new AbortController();
      const { fetchImpl } = fakeFetch(() => Promise.resolve(new Response(stream)));
      const pending = createFetcher(fetchImpl)({ ...request, signal: caller.signal });
      await vi.advanceTimersByTimeAsync(stop === "timeout" ? 1000 : 10);
      if (stop === "aborted") caller.abort();
      expect(failure(await pending)).toMatchObject({ kind: "unavailable", reason: stop });
      expect(onCancel).toHaveBeenCalledOnce();
      expect(stream.locked).toBe(false);
    }
  });

  it("a response that arrives after the timeout is cancelled unread", async () => {
    const onCancel = vi.fn();
    let deliver: (response: Response) => void = () => undefined;
    const { fetchImpl } = fakeFetch(
      () =>
        new Promise<Response>((resolve) => {
          deliver = resolve;
        }),
    );
    const pending = createFetcher(fetchImpl)(request);
    await vi.advanceTimersByTimeAsync(1000);
    expect(failure(await pending)).toMatchObject({ kind: "unavailable", reason: "timeout" });
    deliver(new Response(endlessBody(onCancel)));
    await vi.advanceTimersByTimeAsync(0);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("an abort in the same moment as a ready answer -> unavailable aborted, never the answer", async () => {
    const caller = new AbortController();
    const onCancel = vi.fn();
    const { fetchImpl } = fakeFetch(() => Promise.resolve(new Response(body([[1, 2], [3]], onCancel))));
    const pending = createFetcher(fetchImpl)({ ...request, signal: caller.signal });
    caller.abort();
    expect(failure(await pending)).toMatchObject({ kind: "unavailable", reason: "aborted" });
    await vi.advanceTimersByTimeAsync(0);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("an abort that lands after the answer is ready, before the fetcher resumes -> aborted, body cancelled unread", async () => {
    const caller = new AbortController();
    const onCancel = vi.fn();
    // A thenable settles the fetch and then aborts in the same step, so the answer is queued ahead of the stop.
    const fetchImpl = (() => ({
      then(deliver: (response: Response) => void) {
        deliver(new Response(endlessBody(onCancel)));
        caller.abort();
      },
    })) as unknown as FetchImpl;
    const pending = createFetcher(fetchImpl)({ ...request, signal: caller.signal });
    expect(failure(await pending)).toMatchObject({ kind: "unavailable", reason: "aborted" });
    await vi.advanceTimersByTimeAsync(0);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("lets go of the caller's signal once settled: a later abort reaches nothing", async () => {
    const caller = new AbortController();
    const { fetchImpl, calls } = fakeFetch(() => Promise.resolve(new Response("ok")));
    value(await createFetcher(fetchImpl)({ ...request, signal: caller.signal }));
    caller.abort();
    expect(calls[0]?.init?.signal?.aborted).toBe(false);
  });
});

describe("textOf and jsonOf", () => {
  const answer = (bytes: number[] | string): FetchResponse => ({
    status: 200,
    headers: {},
    bytes: typeof bytes === "string" ? new TextEncoder().encode(bytes) : new Uint8Array(bytes),
  });

  it("textOf decodes UTF-8, replaces bad bytes instead of failing, drops a leading BOM", () => {
    expect(textOf(answer("Caso nº 1 ✓"))).toBe("Caso nº 1 ✓");
    expect(textOf(answer([0x61, 0xff, 0x62]))).toBe("a�b");
    expect(textOf(answer([0xef, 0xbb, 0xbf, 0x7b, 0x7d]))).toBe("{}");
  });

  it("jsonOf parses any JSON value", () => {
    expect(jsonOf(answer('{"title":"x"}'))).toEqual({ ok: true, value: { title: "x" } });
    expect(jsonOf(answer("null"))).toEqual({ ok: true, value: null });
    expect(jsonOf(answer('""'))).toEqual({ ok: true, value: "" });
  });

  it("jsonOf on anything else -> invalid not-json", () => {
    for (const text of ["%PDF-1.4", "", "{", "<html></html>"]) {
      expect(failure(jsonOf(answer(text)))).toMatchObject({ kind: "invalid", reason: "not-json" });
    }
  });
});
