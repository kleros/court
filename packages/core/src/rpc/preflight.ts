import { RPC_URL_KEYS, type CourtEnv } from "../config/index.ts";
import { readRpcUrl } from "./client.ts";
import type { PreflightResult } from "./types.ts";

/**
 * The deploy preflight (D-18): dynamic scripts run in a frame with an opaque origin, so their RPC requests carry
 * `Origin: null`, and they use the same read RPC as the app. A read RPC that refuses that origin breaks every script
 * on its chain, so the production deploy stops instead. Reasons are built from fixed text, HTTP statuses and chain ids
 * only: the URL carries the API key, and what an endpoint sends is not printed either.
 */

const TIMEOUT_MS = 20_000;
/** The production court chains, listed in the chain menus: a deploy without their read RPC is broken. */
const REQUIRED_CHAINS: ReadonlySet<number> = new Set([1, 100]);

type Exchange = { readonly response: Response; readonly body: string } | { readonly problem: string };

/** A failed connection named by its system code (e.g. ECONNREFUSED) at most, never by its message. */
function connectionProblem(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
  return typeof code === "string" && /^[A-Z0-9_]{3,40}$/.test(code)
    ? `connection failed (${code})`
    : "connection failed";
}

/** One request, never following a redirect (a browser refuses a redirected CORS preflight), ended at 20 s. */
async function exchange(url: string, fetchImpl: typeof globalThis.fetch, init: RequestInit): Promise<Exchange> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { ...init, redirect: "manual", signal: controller.signal });
    return { response, body: await response.text() };
  } catch (error) {
    return {
      problem: controller.signal.aborted ? `no answer within ${String(TIMEOUT_MS / 1000)} s` : connectionProblem(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function allowsOpaqueOrigin(response: Response): boolean {
  const value = response.headers.get("access-control-allow-origin")?.trim();
  return value === "null" || value === "*";
}

function allowsContentType(response: Response): boolean {
  const names = new Set(
    (response.headers.get("access-control-allow-headers") ?? "").split(",").map((name) => name.trim().toLowerCase()),
  );
  return names.has("content-type") || names.has("*");
}

function problemOf(exchanged: Exchange, isPreflight: boolean): string | undefined {
  if ("problem" in exchanged) return exchanged.problem;
  const { response } = exchanged;
  // A browser reports a manual redirect as an opaque answer; Node gives the 3xx itself.
  if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) return "redirected";
  if (!response.ok) return `HTTP ${String(response.status)}`;
  if (!allowsOpaqueOrigin(response)) return "Access-Control-Allow-Origin allows neither null nor every origin";
  if (isPreflight && !allowsContentType(response)) return "Access-Control-Allow-Headers does not allow content-type";
  return undefined;
}

function chainIdOf(body: string): number | undefined {
  try {
    const answer: unknown = JSON.parse(body);
    const result = typeof answer === "object" && answer !== null && "result" in answer ? answer.result : undefined;
    if (typeof result !== "string" || !/^0x[0-9a-f]{1,16}$/i.test(result)) return undefined;
    const id = Number(BigInt(result));
    return Number.isSafeInteger(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Passes when the endpoint answers a CORS preflight and an `eth_chainId` request sent with `Origin: null` as a browser
 * needs (2xx, no redirect, Access-Control-Allow-Origin `null` or `*`, content-type allowed) and is `chainId`.
 */
export async function preflightEndpoint(
  url: string,
  chainId: number,
  fetchImpl: typeof globalThis.fetch,
): Promise<PreflightResult> {
  const fail = (reason: string): PreflightResult => ({ chainId, status: "fail", reason });
  const preflight = await exchange(url, fetchImpl, {
    method: "OPTIONS",
    headers: {
      Origin: "null",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  const preflightProblem = problemOf(preflight, true);
  if (preflightProblem !== undefined) return fail(`preflight: ${preflightProblem}`);
  const request = await exchange(url, fetchImpl, {
    method: "POST",
    headers: { Origin: "null", "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
  });
  const requestProblem = problemOf(request, false);
  if (requestProblem !== undefined) return fail(`request: ${requestProblem}`);
  const answered = "body" in request ? chainIdOf(request.body) : undefined;
  if (answered === undefined) return fail("request: the answer carries no chain id");
  if (answered !== chainId) return fail(`request: the endpoint is chain ${String(answered)}, not ${String(chainId)}`);
  return { chainId, status: "pass" };
}

/**
 * Every chain the app has a read RPC setting for: a configured one is checked; an unset one fails on Mainnet and
 * Gnosis and is reported not-configured elsewhere.
 */
export function preflightAll(
  env: Pick<CourtEnv, "rpcUrls">,
  fetchImpl: typeof globalThis.fetch,
): Promise<readonly PreflightResult[]> {
  return Promise.all(
    Object.keys(RPC_URL_KEYS).map((key): Promise<PreflightResult> => {
      const chainId = Number(key);
      const url = readRpcUrl(env, chainId);
      if (url !== null) return preflightEndpoint(url, chainId, fetchImpl);
      return Promise.resolve(
        REQUIRED_CHAINS.has(chainId)
          ? { chainId, status: "fail", reason: "no read RPC is configured" }
          : { chainId, status: "not-configured" },
      );
    }),
  );
}
