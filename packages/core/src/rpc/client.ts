import { createPublicClient, custom, http, type Chain } from "viem";
import { gnosis, gnosisChiado, mainnet, sepolia } from "viem/chains";
import type { CourtEnv } from "../config/index.ts";
import { succeed, unavailable, type GetReadClient, type ReadClient } from "../kernel/index.ts";
import { isBudgetError, isRangeLimitError } from "./errors.ts";
import type { RequestBudget } from "./types.ts";

/** Per JSON-RPC request (design parameters, today's Reality lookup value). */
const READ_TIMEOUT_MS = 20_000;
/** Two retries, after 500 ms and then 2 s (today's Reality lookup policy, now every read's). */
const RETRY_DELAYS_MS: readonly number[] = [500, 2_000];

/** The court chains carry viem's chain object, which holds the Multicall3 address the batch reads use. */
const COURT_CHAINS: ReadonlyMap<number, Chain> = new Map(
  [mainnet, gnosis, sepolia, gnosisChiado].map((chain) => [chain.id, chain]),
);

interface JsonRpcCall {
  readonly method: string;
  readonly params?: unknown;
}
/** One attempt of one JSON-RPC request: no retry inside. */
type Attempt = (call: JsonRpcCall) => Promise<unknown>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Every failure is retried except an eth_getLogs range refusal, which goes straight back so the scan splits the range
 * (retrying would repeat the refusal), and a spent budget.
 */
function retrying(attempt: Attempt): Attempt {
  return async (call) => {
    for (let retry = 0; ; retry += 1) {
      try {
        return await attempt(call);
      } catch (error) {
        const delay = RETRY_DELAYS_MS[retry];
        const refusedRange = call.method === "eth_getLogs" && isRangeLimitError(error);
        if (delay === undefined || refusedRange || isBudgetError(error)) throw error;
        await sleep(delay);
      }
    }
  };
}

/**
 * The single attempt under each client made here, so withBudget can count attempts below the retries. A client made
 * elsewhere (a test's custom transport) is not in it: its request counts as one attempt.
 */
const attempts = new WeakMap<ReadClient, Attempt>();

function clientOver(attempt: Attempt, chain: Chain | undefined): ReadClient {
  // viem's own retries are off: they differ (backoff, which errors) and would retry range refusals.
  // Offchain lookups (CCIP read) are off: on that revert viem fetches URLs the called contract names, outside this
  // transport and with no timeout. Today's app never follows them; the call fails as the revert it is.
  const client = createPublicClient({
    chain,
    transport: custom({ request: retrying(attempt) }, { retryCount: 0 }),
    ccipRead: false,
  });
  attempts.set(client, attempt);
  return client;
}

/** The chain's configured read RPC, or null. Never a public or Reown fallback (D-01). */
export function readRpcUrl(env: Pick<CourtEnv, "rpcUrls">, chainId: number): string | null {
  return env.rpcUrls[chainId] ?? null;
}

/**
 * A read client over one URL. Batching is off so each request has its own timeout. `fetchFn` is for this folder's
 * tests (a fake endpoint, no network); the app uses the global fetch.
 */
export function createReadClient(
  url: string,
  chainId: number,
  options: { readonly timeoutMs: number; readonly fetchFn?: typeof globalThis.fetch },
): ReadClient {
  const { request } = http(url, { timeout: options.timeoutMs, retryCount: 0, batch: false, fetchFn: options.fetchFn })({
    retryCount: 0,
  });
  return clientOver(async (call) => {
    const result = await request(call);
    // A JSON-RPC answer always carries a result (null included); an answer without one is a failure, retried like any
    // other. viem reads an empty 2xx body not typed as JSON as `{}` and throws nothing, while today's provider rejects it
    // as invalid JSON and the lookup retries it. The sentence avoids range and rate words, so a log scan does not split.
    if (result === undefined) throw new Error("The RPC answer carried no result.");
    return result;
  }, COURT_CHAINS.get(chainId));
}

/** One read client per chain with a configured read RPC, made on first use; not-configured otherwise. */
export function createReadClients(
  env: Pick<CourtEnv, "rpcUrls">,
  options: { readonly timeoutMs?: number } = {},
): GetReadClient {
  const clients = new Map<number, ReadClient>();
  return (chainId) => {
    const made = clients.get(chainId);
    if (made !== undefined) return succeed(made);
    const url = readRpcUrl(env, chainId);
    if (url === null) return unavailable("not-configured", `No read RPC is configured for chain ${String(chainId)}.`);
    const client = createReadClient(url, chainId, { timeoutMs: options.timeoutMs ?? READ_TIMEOUT_MS });
    clients.set(chainId, client);
    return succeed(client);
  };
}

/**
 * The same reads, each attempt (retries included) spending `budget` first: a spent budget stops the request before
 * it is sent. Shared clients stay unbudgeted; a lookup wraps them for its own count.
 */
export function withBudget(client: ReadClient, budget: RequestBudget): ReadClient {
  const attempt =
    attempts.get(client) ?? ((call: JsonRpcCall) => client.request(call as Parameters<ReadClient["request"]>[0]));
  return clientOver((call) => {
    budget.spend();
    return attempt(call);
  }, client.chain);
}
