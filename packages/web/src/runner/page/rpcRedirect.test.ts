import { describe, expect, it } from "vitest";
import { OLD_RPC_URL, SAMPLE_REDIRECTS, createFakeRunnerEnvironment } from "../testing";
import type { FetchFunction } from "../types";
import { installRpcRedirect, redirectTarget } from "./rpcRedirect";

const TARGET = "https://rpc.example/mainnet";
const NOT_REDIRECTED = "https://ipfs.example/ipfs/Qm";
// The form the pinned web3 bundles use for their RPC calls (stream-http): fetch(urlString, {method, headers, body}).
const RPC_CALL: RequestInit = {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: '{"jsonrpc":"2.0","id":1}',
};

/** The redirect installed over a fetch that records the URL each call reached and answers with `answer()`. */
function redirectOver(answer: () => Promise<Response>): { fetch: FetchFunction; reached: string[] } {
  const reached: string[] = [];
  let fetch: FetchFunction | undefined;
  installRpcRedirect(
    {
      wrapFetch: (wrap) => {
        fetch = wrap((input) => {
          reached.push(input instanceof Request ? input.url : String(input));
          return answer();
        });
      },
      wrapXhrOpen: () => undefined,
    },
    SAMPLE_REDIRECTS,
  );
  if (fetch === undefined) throw new Error("installRpcRedirect wrapped no fetch");
  return { fetch, reached };
}

/** One fetch per path through the wrapper: a matching string, URL and Request, a non-matching string and Request. */
function everyPath(): [RequestInfo | URL, RequestInit?][] {
  return [
    [OLD_RPC_URL, RPC_CALL],
    [new URL(OLD_RPC_URL)],
    [new Request(OLD_RPC_URL, RPC_CALL)],
    [NOT_REDIRECTED, RPC_CALL],
    [new Request(NOT_REDIRECTED)],
  ];
}

describe("redirectTarget (P43 keep: one exact URL)", () => {
  it("redirects the exact URL", () => {
    expect(redirectTarget(SAMPLE_REDIRECTS, OLD_RPC_URL)).toBe(TARGET);
  });

  it("leaves every other URL alone, near misses included", () => {
    for (const url of [
      `${OLD_RPC_URL}/`,
      `${OLD_RPC_URL}0`,
      OLD_RPC_URL.replace("https:", "http:"),
      OLD_RPC_URL.replace("0123456789abcdef", "fedcba9876543210"),
      "https://old-rpc.example/v3/",
      "https://ipfs.example/ipfs/Qm",
      "not a url",
    ]) {
      expect(redirectTarget(SAMPLE_REDIRECTS, url)).toBeUndefined();
    }
  });
});

describe("installRpcRedirect", () => {
  it("rewrites a matching fetch given as a string or a URL and hands the caller's options on (P43 keep)", async () => {
    const fake = createFakeRunnerEnvironment();
    installRpcRedirect(fake.env.network, SAMPLE_REDIRECTS);

    await fake.fetch(OLD_RPC_URL, RPC_CALL);
    await fake.fetch(new URL(OLD_RPC_URL), RPC_CALL);
    await fake.fetch(OLD_RPC_URL);

    expect(fake.requests).toEqual([
      { via: "fetch", input: TARGET, rest: [RPC_CALL] },
      { via: "fetch", input: TARGET, rest: [RPC_CALL] },
      { via: "fetch", input: TARGET, rest: [] },
    ]);
  });

  it("rebuilds a matching Request for the new URL with everything else kept, and hands the caller's options on", async () => {
    const fake = createFakeRunnerEnvironment();
    installRpcRedirect(fake.env.network, SAMPLE_REDIRECTS);
    const controller = new AbortController();
    const options: RequestInit = { cache: "reload" };

    await fake.fetch(
      new Request(OLD_RPC_URL, {
        ...RPC_CALL,
        credentials: "omit",
        cache: "no-store",
        redirect: "manual",
        integrity: "sha256-AAAA",
        keepalive: true,
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      }),
      options,
    );

    const [sent] = fake.requests;
    expect(sent?.rest).toEqual([options]);
    const request = sent?.input as Request;
    expect(request).toBeInstanceOf(Request);
    expect(request.url).toBe(TARGET);
    expect(request.method).toBe("POST");
    expect(request.headers.get("content-type")).toBe("application/json");
    await expect(request.text()).resolves.toBe(RPC_CALL.body);
    expect(request.credentials).toBe("omit");
    expect(request.cache).toBe("no-store");
    expect(request.redirect).toBe("manual");
    expect(request.integrity).toBe("sha256-AAAA");
    expect(request.keepalive).toBe(true);
    expect(request.referrerPolicy).toBe("no-referrer");
    expect(request.signal.aborted).toBe(false);
    controller.abort();
    expect(request.signal.aborted).toBe(true);
  });

  it("passes a non-matching fetch through untouched, the caller's options included", async () => {
    const fake = createFakeRunnerEnvironment();
    installRpcRedirect(fake.env.network, SAMPLE_REDIRECTS);
    const request = new Request("https://ipfs.example/ipfs/Qm");

    await fake.fetch("https://rpc.example/gnosis", RPC_CALL);
    await fake.fetch(request, RPC_CALL);

    expect(fake.requests).toEqual([
      { via: "fetch", input: "https://rpc.example/gnosis", rest: [RPC_CALL] },
      { via: "fetch", input: request, rest: [RPC_CALL] },
    ]);
    expect(fake.requests[1]?.input).toBe(request);
  });

  // The pinned web3 bundles read each call's answer (stream-http: fetch(url, {...}).then(onResponse, onError)), and the
  // wrapper sits under every fetch a script makes, redirected or not.
  it("hands the caller the original fetch's own response on every path (P43 keep)", async () => {
    const response = new Response("{}");
    const { fetch, reached } = redirectOver(() => Promise.resolve(response));

    for (const [input, init] of everyPath()) await expect(fetch(input, init)).resolves.toBe(response);

    expect(reached).toEqual([TARGET, TARGET, TARGET, NOT_REDIRECTED, NOT_REDIRECTED]);
  });

  it("hands the caller the original fetch's own failure on every path (P43 keep)", async () => {
    const failure = new TypeError("Failed to fetch");
    const { fetch, reached } = redirectOver(() => Promise.reject(failure));

    for (const [input, init] of everyPath()) await expect(fetch(input, init)).rejects.toBe(failure);

    expect(reached).toEqual([TARGET, TARGET, TARGET, NOT_REDIRECTED, NOT_REDIRECTED]);
  });

  it("opens the caller's request with the caller's method, rewriting only a matching URL (P43 keep)", () => {
    const fake = createFakeRunnerEnvironment();
    installRpcRedirect(fake.env.network, SAMPLE_REDIRECTS);
    const request = {} as XMLHttpRequest;

    // Most pinned web3 bundles open their RPC calls as open("POST", host, true) on the native XMLHttpRequest.
    fake.xhrOpen(request, "POST", OLD_RPC_URL, true);
    fake.xhrOpen(request, "POST", OLD_RPC_URL);
    fake.xhrOpen(request, "POST", new URL(OLD_RPC_URL), true, null, null);
    fake.xhrOpen(request, "POST", "https://rpc.example/gnosis", true);
    fake.xhrOpen(request, "GET", "https://ipfs.example/ipfs/Qm");

    expect(fake.requests).toEqual([
      { via: "xhr", receiver: request, method: "POST", input: TARGET, rest: [true] },
      { via: "xhr", receiver: request, method: "POST", input: TARGET, rest: [] },
      { via: "xhr", receiver: request, method: "POST", input: TARGET, rest: [true, null, null] },
      { via: "xhr", receiver: request, method: "POST", input: "https://rpc.example/gnosis", rest: [true] },
      { via: "xhr", receiver: request, method: "GET", input: "https://ipfs.example/ipfs/Qm", rest: [] },
    ]);
    // toEqual compares the receiver by shape only; each open must run on the caller's own request.
    for (const sent of fake.requests) expect(sent.via === "xhr" ? sent.receiver : undefined).toBe(request);
  });

  it("wraps nothing when there are no redirects", () => {
    let wrapped = 0;
    installRpcRedirect(
      {
        wrapFetch: () => {
          wrapped += 1;
        },
        wrapXhrOpen: () => {
          wrapped += 1;
        },
      },
      [],
    );
    expect(wrapped).toBe(0);
  });
});
