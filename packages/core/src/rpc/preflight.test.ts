import { afterEach, describe, expect, it, vi } from "vitest";
import { preflightAll, preflightEndpoint } from "./preflight.ts";

// A fake endpoint as a fetch function: Response objects, no network. (Core's src may not import node:http, so the
// real-fetch path is checked by the lab proof and by a run of the CLI against a local server, outside this folder.)
const URL_WITH_KEY = "https://eth-mainnet.example-provider.org/v2/Zx81kPq0SecretKey";
const COURT_ORIGIN = "https://court.kleros.io";

interface EndpointSettings {
  readonly preflightStatus?: number;
  readonly preflightOrigin?: string | null;
  readonly allowHeaders?: string | null;
  readonly postStatus?: number;
  readonly postOrigin?: string | null;
  readonly chainIdAnswer?: unknown;
  readonly fails?: "preflight" | "post";
  readonly hangs?: boolean;
}

interface SentRequest {
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly redirect: RequestRedirect | undefined;
}

function headersOf(init: HeadersInit | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  new Headers(init).forEach((value, name) => {
    headers[name] = value;
  });
  return headers;
}

function endpoint(settings: EndpointSettings = {}) {
  const sent: SentRequest[] = [];
  const header = (name: string, value: string | null | undefined): Record<string, string> =>
    value === null || value === undefined ? {} : { [name]: value };
  const fetchImpl = (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const method = init?.method ?? "GET";
    sent.push({
      method,
      headers: headersOf(init?.headers),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      redirect: init?.redirect,
    });
    if (settings.hangs === true)
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    if (method === "OPTIONS") {
      if (settings.fails === "preflight") return Promise.reject(new TypeError(`fetch failed: ${URL_WITH_KEY}`));
      return Promise.resolve(
        new Response(null, {
          status: settings.preflightStatus ?? 204,
          headers: {
            ...header(
              "access-control-allow-origin",
              settings.preflightOrigin === undefined ? "null" : settings.preflightOrigin,
            ),
            ...header(
              "access-control-allow-headers",
              settings.allowHeaders === undefined ? "content-type" : settings.allowHeaders,
            ),
            ...(settings.preflightStatus === 302 ? { location: URL_WITH_KEY } : {}),
          },
        }),
      );
    }
    if (settings.fails === "post") return Promise.reject(new TypeError("fetch failed"));
    const result = settings.chainIdAnswer === undefined ? "0x1" : settings.chainIdAnswer;
    return Promise.resolve(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
        status: settings.postStatus ?? 200,
        headers: {
          "content-type": "application/json",
          ...header("access-control-allow-origin", settings.postOrigin === undefined ? "null" : settings.postOrigin),
        },
      }),
    );
  };
  return { fetchImpl, sent };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("preflightEndpoint", () => {
  it("passes an endpoint that lets an opaque origin (Origin: null) read it, as the script runner's frame is", async () => {
    const { fetchImpl, sent } = endpoint();
    expect(await preflightEndpoint(URL_WITH_KEY, 1, fetchImpl)).toEqual({ chainId: 1, status: "pass" });
    expect(sent.map((r) => r.method)).toEqual(["OPTIONS", "POST"]);
    expect(sent[0]?.headers).toMatchObject({
      origin: "null",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    });
    expect(sent[1]?.headers).toMatchObject({ origin: "null", "content-type": "application/json" });
    expect(sent[1]?.body).toMatchObject({ method: "eth_chainId" });
    expect(sent.every((r) => r.redirect === "manual")).toBe(true);
  });

  it("passes Access-Control-Allow-Origin * and Access-Control-Allow-Headers *", async () => {
    const { fetchImpl } = endpoint({ preflightOrigin: "*", postOrigin: "*", allowHeaders: "*" });
    expect(await preflightEndpoint(URL_WITH_KEY, 1, fetchImpl)).toEqual({ chainId: 1, status: "pass" });
  });

  it.each<[string, EndpointSettings, string]>([
    ["the preflight allows only the court's origin", { preflightOrigin: COURT_ORIGIN }, "Access-Control-Allow-Origin"],
    ["the preflight names no origin", { preflightOrigin: null }, "Access-Control-Allow-Origin"],
    ["the request allows only the court's origin", { postOrigin: COURT_ORIGIN }, "Access-Control-Allow-Origin"],
    ["the preflight redirects", { preflightStatus: 302 }, "redirect"],
    ["the request redirects", { postStatus: 301 }, "redirect"],
    ["the preflight does not allow content-type", { allowHeaders: "authorization" }, "content-type"],
    ["the preflight names no allowed headers", { allowHeaders: null }, "content-type"],
    ["the preflight answers 403", { preflightStatus: 403 }, "HTTP 403"],
    ["the request answers 500", { postStatus: 500 }, "HTTP 500"],
    ["the endpoint is another chain", { chainIdAnswer: "0x64" }, "chain 100"],
    ["the chain id is not a number", { chainIdAnswer: "mainnet" }, "chain id"],
    ["the connection fails", { fails: "preflight" }, "connection failed"],
  ])("fails when %s, naming why without the URL", async (_name, settings, why) => {
    const { fetchImpl } = endpoint(settings);
    const result = await preflightEndpoint(URL_WITH_KEY, 1, fetchImpl);
    expect(result.status).toBe("fail");
    if (result.status !== "fail") return;
    expect(result.reason).toContain(why);
    expect(result.reason).not.toContain("example-provider");
    expect(result.reason).not.toContain("SecretKey");
    expect(result.reason).not.toContain(COURT_ORIGIN);
  });

  it("fails an endpoint that does not answer within 20 s", async () => {
    vi.useFakeTimers();
    const { fetchImpl } = endpoint({ hangs: true });
    const pending = preflightEndpoint(URL_WITH_KEY, 1, fetchImpl);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await pending).toEqual({ chainId: 1, status: "fail", reason: "preflight: no answer within 20 s" });
  });
});

describe("preflightAll", () => {
  it("checks every configured read RPC; Mainnet or Gnosis unset fails, any other unset chain is reported not-configured", async () => {
    const { fetchImpl, sent } = endpoint({ chainIdAnswer: "0x89" });
    const results = await preflightAll({ rpcUrls: { 137: URL_WITH_KEY } }, fetchImpl);
    const byChain = new Map(results.map((r) => [r.chainId, r]));
    expect(byChain.get(1)).toEqual({ chainId: 1, status: "fail", reason: "no read RPC is configured" });
    expect(byChain.get(100)).toEqual({ chainId: 100, status: "fail", reason: "no read RPC is configured" });
    expect(byChain.get(10200)).toEqual({ chainId: 10200, status: "not-configured" });
    expect(byChain.get(11155111)).toEqual({ chainId: 11155111, status: "not-configured" });
    expect(byChain.get(137)).toEqual({ chainId: 137, status: "pass" });
    expect(results).toHaveLength(17);
    expect(sent).toHaveLength(2);
  });

  it("checks each chain against its own chain id", async () => {
    const { fetchImpl } = endpoint({ chainIdAnswer: "0x1" });
    const results = await preflightAll({ rpcUrls: { 1: URL_WITH_KEY, 100: URL_WITH_KEY } }, fetchImpl);
    expect(results.find((r) => r.chainId === 1)?.status).toBe("pass");
    expect(results.find((r) => r.chainId === 100)).toMatchObject({ status: "fail" });
  });
});
