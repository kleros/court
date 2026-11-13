import { encodeErrorResult, offchainLookupAbiItem, parseAbiItem } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRetryable } from "../kernel/index.ts";
import { createRequestBudget } from "./budget.ts";
import { createReadClient, createReadClients, readRpcUrl, withBudget } from "./client.ts";
import { isContractRevert, toReadFailure } from "./errors.ts";
import { customClient, fakeRpc, rpcError, type RpcAnswer } from "./fakeRpc.ts";
import { getLogsChunked } from "./logs.ts";

const URL_1 = "https://rpc.example.org/v2/key-mainnet-123456";
const env = { rpcUrls: { 1: URL_1, 137: "https://polygon.example.org/key-polygon-123456" } };
const BLOCK = { result: "0x10" } as const;
const UNAVAILABLE = { status: 503, body: "Service Unavailable" } as const;
// A provider's answer when eth_getLogs asks for too much (documented by Infura).
const RANGE_REFUSAL = { error: { code: -32005, message: "query returned more than 10000 results" } } as const;
const LOGS_PARAMS = { address: "0x0000000000000000000000000000000000000001", fromBlock: 0n, toBlock: 100n } as const;
// A 2xx answer with an empty body not typed as JSON. Today's provider rejects it as invalid JSON and retries it.
const EMPTY = { status: 200 } as const;

function clientAnswering(answers: readonly RpcAnswer[], timeoutMs = 20_000) {
  const rpc = fakeRpc((_call, index) => answers[Math.min(index, answers.length - 1)] ?? BLOCK);
  return { ...rpc, client: createReadClient(URL_1, 1, { timeoutMs, fetchFn: rpc.fetchFn }) };
}

async function settle<T>(promise: Promise<T>): Promise<{ value?: T; error?: unknown }> {
  try {
    return { value: await promise };
  } catch (error) {
    return { error };
  }
}

describe("readRpcUrl", () => {
  it("is the chain's configured URL, or null when the chain has none", () => {
    expect(readRpcUrl(env, 1)).toBe(URL_1);
    expect(readRpcUrl(env, 100)).toBeNull();
  });
});

describe("createReadClients", () => {
  it("a chain without a read RPC is unavailable not-configured, never a fallback, and not retried by itself", () => {
    const outcome = createReadClients(env)(100);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure).toMatchObject({ kind: "unavailable", reason: "not-configured" });
    expect(outcome.failure.message).not.toContain("http");
    expect(isRetryable(outcome.failure)).toBe(false);
  });

  it("gives one client per chain, made once", () => {
    const getReadClient = createReadClients(env);
    const first = getReadClient(1);
    const second = getReadClient(1);
    expect(first.ok && second.ok && first.value === second.value).toBe(true);
  });

  it("court chains carry viem's chain (Multicall3 address for batch reads); other configured chains get a plain client", () => {
    const getReadClient = createReadClients({ rpcUrls: { ...env.rpcUrls, 100: "https://gnosis.example.org/k" } });
    for (const chainId of [1, 100]) {
      const outcome = getReadClient(chainId);
      expect(outcome.ok && outcome.value.chain?.id).toBe(chainId);
      expect(outcome.ok && outcome.value.chain?.contracts?.multicall3?.address).toBe(
        "0xca11bde05977b3631167028862be2a173976ca11",
      );
    }
    const polygon = getReadClient(137);
    expect(polygon.ok && polygon.value.chain).toBeUndefined();
  });
});

describe("read client requests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries a failed request twice, after 500 ms and then 2 s", async () => {
    const { client, calls } = clientAnswering([UNAVAILABLE, UNAVAILABLE, BLOCK]);
    const pending = client.getBlockNumber({ cacheTime: 0 });
    await vi.advanceTimersByTimeAsync(2_600);
    await expect(pending).resolves.toBe(16n);
    expect(calls.map((call) => call.at)).toEqual([0, 500, 2_500]);
  });

  it("gives up after the second retry with the last error", async () => {
    const { client, calls } = clientAnswering([UNAVAILABLE]);
    const pending = settle(client.getBlockNumber({ cacheTime: 0 }));
    await vi.advanceTimersByTimeAsync(3_000);
    const { error } = await pending;
    expect(calls).toHaveLength(3);
    expect(toReadFailure(error, "the head")).toMatchObject({ kind: "unavailable", reason: "http-status" });
  });

  it("returns an eth_getLogs range refusal at once, so the scan can split the range", async () => {
    const { client, calls } = clientAnswering([RANGE_REFUSAL]);
    const pending = settle(client.getLogs(LOGS_PARAMS));
    await vi.advanceTimersByTimeAsync(3_000);
    expect((await pending).error).toBeDefined();
    expect(calls).toHaveLength(1);
  });

  it("retries other eth_getLogs failures, and range-worded failures of other methods", async () => {
    const logs = clientAnswering([UNAVAILABLE, UNAVAILABLE, { result: [] }]);
    const pendingLogs = logs.client.getLogs(LOGS_PARAMS);
    const call = clientAnswering([RANGE_REFUSAL, RANGE_REFUSAL, { result: "0x" }]);
    const pendingCall = call.client.call({ to: "0x0000000000000000000000000000000000000001", data: "0x" });
    await vi.advanceTimersByTimeAsync(3_000);
    await expect(pendingLogs).resolves.toEqual([]);
    await expect(pendingCall).resolves.toEqual({ data: undefined });
    expect([logs.calls.length, call.calls.length]).toEqual([3, 3]);
  });

  it("ends every request at the timeout; an eth_getLogs timeout counts as a range refusal and is not retried", async () => {
    const head = clientAnswering(["hang", "hang", BLOCK], 1_000);
    const pendingHead = head.client.getBlockNumber({ cacheTime: 0 });
    const logs = clientAnswering(["hang"], 1_000);
    const pendingLogs = settle(logs.client.getLogs(LOGS_PARAMS));
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(pendingHead).resolves.toBe(16n);
    expect(head.calls.map((c) => c.at)).toEqual([0, 1_500, 4_500]);
    expect(toReadFailure((await pendingLogs).error, "logs")).toMatchObject({ reason: "timeout" });
    expect(logs.calls).toHaveLength(1);
  });

  it("by default a request ends at 20 s; the retries follow 500 ms and 2 s later", async () => {
    const sentAt: number[] = [];
    const start = Date.now();
    vi.stubGlobal("fetch", (_input: unknown, init?: RequestInit) => {
      sentAt.push(Date.now() - start);
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });
    try {
      const outcome = createReadClients(env)(1);
      if (!outcome.ok) throw new Error("expected a client");
      const pending = settle(outcome.value.getBlockNumber({ cacheTime: 0 }));
      await vi.advanceTimersByTimeAsync(63_000);
      expect(toReadFailure((await pending).error, "the head")).toMatchObject({ reason: "timeout" });
      expect(sentAt).toEqual([0, 20_500, 42_500]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("never follows a contract's offchain lookup: nothing is fetched outside the RPC and the call rejects as a revert", async () => {
    // The called contract names the URLs; viem would fetch them with the global fetch and no timeout.
    const contract = "0x00000000000000000000000000000000000000aa";
    const lookup = encodeErrorResult({
      abi: [offchainLookupAbiItem],
      errorName: "OffchainLookup",
      args: [contract, ["https://creator.example/{sender}/{data}.json"], "0x1234", "0x12345678", "0x"],
    });
    const outside: string[] = [];
    vi.stubGlobal("fetch", (input: unknown) => {
      outside.push(String(input));
      return Promise.reject(new TypeError("fetch failed"));
    });
    try {
      const { client } = clientAnswering([{ error: { code: 3, message: "execution reverted", data: lookup } }]);
      const budgeted = withBudget(client, createRequestBudget({ maxRequests: 10, deadlineMs: 60_000 }));
      const pending = [client, budgeted].map((each) => settle(each.call({ to: contract, data: "0x12345678" })));
      await vi.advanceTimersByTimeAsync(3_000);
      const results = await Promise.all(pending);
      expect(outside).toEqual([]);
      expect(results.map(({ error }) => isContractRevert(error))).toEqual([true, true]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("a JSON-RPC error answer is retried like any failure", async () => {
    const { client, calls } = clientAnswering([{ error: { code: -32000, message: "header not found" } }, BLOCK]);
    const pending = client.getBlockNumber({ cacheTime: 0 });
    await vi.advanceTimersByTimeAsync(600);
    await expect(pending).resolves.toBe(16n);
    expect(calls).toHaveLength(2);
  });

  it("an empty 2xx answer is retried twice, after 500 ms and then 2 s, then ends as a read failure", async () => {
    const { client, calls } = clientAnswering([EMPTY]);
    const pending = settle(client.getBlockNumber({ cacheTime: 0 }));
    await vi.advanceTimersByTimeAsync(3_000);
    const { error } = await pending;
    expect(calls.map((call) => call.at)).toEqual([0, 500, 2_500]);
    expect(error).not.toBeInstanceOf(TypeError);
    expect(toReadFailure(error, "the head")).toMatchObject({ kind: "unavailable", reason: "rpc-error" });
  });

  it("an answer without a result is retried and the next answer is used; a null result is an answer", async () => {
    const empty = clientAnswering([EMPTY, BLOCK]);
    const pendingEmpty = empty.client.getBlockNumber({ cacheTime: 0 });
    // JSON-typed, with no `result` member (JSON drops undefined).
    const noResult = clientAnswering([{ result: undefined }, BLOCK]);
    const pendingNoResult = noResult.client.getBlockNumber({ cacheTime: 0 });
    const pending = clientAnswering([{ result: null }]);
    const pendingReceipt = pending.client.request({
      method: "eth_getTransactionReceipt",
      params: [`0x${"ab".repeat(32)}`],
    });
    await vi.advanceTimersByTimeAsync(600);
    await expect(pendingEmpty).resolves.toBe(16n);
    await expect(pendingNoResult).resolves.toBe(16n);
    await expect(pendingReceipt).resolves.toBeNull();
    expect([empty.calls.length, noResult.calls.length, pending.calls.length]).toEqual([2, 2, 1]);
  });

  it("a log scan answered empty is retried, not split as a range refusal, and ends unavailable", async () => {
    const { client, calls } = clientAnswering([EMPTY]);
    const event = parseAbiItem("event DisputeCreation(uint256 indexed _disputeID, address indexed _arbitrable)");
    const pending = getLogsChunked(client, { ...LOGS_PARAMS, event });
    await vi.advanceTimersByTimeAsync(3_000);
    expect(await pending).toMatchObject({ ok: false, failure: { kind: "unavailable", reason: "rpc-error" } });
    expect(calls.map((call) => call.at)).toEqual([0, 500, 2_500]);
  });
});

describe("withBudget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("spends one request per attempt, retries included", async () => {
    const { client } = clientAnswering([UNAVAILABLE, UNAVAILABLE, BLOCK]);
    const budget = createRequestBudget({ maxRequests: 10, deadlineMs: 60_000 });
    const pending = withBudget(client, budget).getBlockNumber({ cacheTime: 0 });
    await vi.advanceTimersByTimeAsync(3_000);
    await expect(pending).resolves.toBe(16n);
    expect(budget.spent).toBe(3);
  });

  it("spends one request per attempt of an empty 2xx answer too", async () => {
    const { client } = clientAnswering([EMPTY]);
    const budget = createRequestBudget({ maxRequests: 10, deadlineMs: 60_000 });
    const pending = settle(withBudget(client, budget).getBlockNumber({ cacheTime: 0 }));
    await vi.advanceTimersByTimeAsync(3_000);
    expect((await pending).error).toBeDefined();
    expect(budget.spent).toBe(3);
  });

  it("a spent budget stops the request before anything is sent, and is not retried", async () => {
    const { client, calls } = clientAnswering([BLOCK]);
    const budget = createRequestBudget({ maxRequests: 0, deadlineMs: 60_000 });
    const pending = settle(withBudget(client, budget).getBlockNumber({ cacheTime: 0 }));
    await vi.advanceTimersByTimeAsync(3_000);
    const failure = toReadFailure((await pending).error, "the head");
    expect(failure).toMatchObject({ kind: "unavailable", reason: "budget-exhausted" });
    expect(isRetryable(failure)).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("a passed deadline stops the next attempt, also between retries", async () => {
    const { client, calls } = clientAnswering([UNAVAILABLE]);
    const budget = createRequestBudget({ maxRequests: 10, deadlineMs: 1_000 });
    const pending = settle(withBudget(client, budget).getBlockNumber({ cacheTime: 0 }));
    await vi.advanceTimersByTimeAsync(3_000);
    expect(toReadFailure((await pending).error, "the head")).toMatchObject({ reason: "budget-exhausted" });
    expect(calls).toHaveLength(2);
    expect(budget.remainingMs()).toBe(0);
  });

  it("a request sent before the deadline and answered after it keeps its answer; the next one is not sent", async () => {
    // The limits are checked only before sending: a lookup whose last request went out just in time still completes.
    const rpc = fakeRpc(() => BLOCK);
    const answerIn2s: typeof globalThis.fetch = (input, init) => {
      const answer = rpc.fetchFn(input, init);
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve(answer);
        }, 2_000),
      );
    };
    const client = createReadClient(URL_1, 1, { timeoutMs: 20_000, fetchFn: answerIn2s });
    const budget = createRequestBudget({ maxRequests: 10, deadlineMs: 1_000 });
    const budgeted = withBudget(client, budget);
    const pending = budgeted.getBlockNumber({ cacheTime: 0 });
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(pending).resolves.toBe(16n);
    expect(budget.remainingMs()).toBe(0);
    const late = settle(budgeted.getBlockNumber({ cacheTime: 0 }));
    await vi.advanceTimersByTimeAsync(3_000);
    expect(toReadFailure((await late).error, "the head")).toMatchObject({
      kind: "unavailable",
      reason: "budget-exhausted",
    });
    expect(rpc.calls.map((call) => call.at)).toEqual([0]);
  });

  it("one budget counts every client it wraps, and the wrapped client keeps its chain", async () => {
    const budget = createRequestBudget({ maxRequests: 10, deadlineMs: 60_000 });
    const getReadClient = createReadClients(env);
    const mainnet = getReadClient(1);
    expect(mainnet.ok && withBudget(mainnet.value, budget).chain?.id).toBe(1);
    const a = withBudget(clientAnswering([BLOCK]).client, budget);
    const b = withBudget(clientAnswering([BLOCK]).client, budget);
    await a.getBlockNumber({ cacheTime: 0 });
    await b.getBlockNumber({ cacheTime: 0 });
    expect(budget.spent).toBe(2);
  });

  it("a client made elsewhere (a test's custom transport) counts one attempt per request", async () => {
    const budget = createRequestBudget({ maxRequests: 10, deadlineMs: 60_000 });
    let sent = 0;
    const client = customClient(() => {
      sent += 1;
      return sent === 1 ? Promise.reject(rpcError(-32000, "header not found")) : Promise.resolve("0x10");
    });
    const pending = withBudget(client, budget).getBlockNumber({ cacheTime: 0 });
    await vi.advanceTimersByTimeAsync(600);
    await expect(pending).resolves.toBe(16n);
    expect([sent, budget.spent]).toEqual([2, 2]);
  });
});
