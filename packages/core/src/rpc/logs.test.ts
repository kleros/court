import { numberToHex, pad, parseAbiItem, TimeoutError, toHex } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestBudget } from "./budget.ts";
import { createReadClient, withBudget } from "./client.ts";
import { customClient, fakeRpc, rpcError } from "./fakeRpc.ts";
import { getLogsChunked } from "./logs.ts";
import type { LogWindows } from "./types.ts";

afterEach(() => {
  vi.useRealTimers();
});

// Synthetic logs in the shape of KlerosLiquid's DisputeCreation (signature and topic0 as the design's event table
// gives them); blocks, hashes and ids are made up.
const KLEROS_LIQUID = "0x9c1da9a04925bdfdedf0f6421bc7eea8305f9002";
const ARBITRABLE = "0x66260c69d03837016d88c9877e61e08ef74c59f2";
const DISPUTE_CREATION = parseAbiItem("event DisputeCreation(uint256 indexed _disputeID, address indexed _arbitrable)");
const TOPIC0 = "0x141dfc18aa6a56fc816f44f0e9e2f1ebc92b15ab167770e17db5b084c10ed995";

interface FakeLog {
  readonly block: number;
  readonly index: number;
  readonly removed?: boolean;
  readonly topics?: readonly `0x${string}`[];
  readonly data?: `0x${string}`;
  readonly transactionHash?: `0x${string}`;
}

function rpcLog({ block, index, removed = false, topics, data = "0x", transactionHash }: FakeLog) {
  return {
    address: KLEROS_LIQUID,
    blockHash: pad(toHex(block)),
    blockNumber: numberToHex(block),
    data,
    logIndex: numberToHex(index),
    removed,
    topics: topics ?? [TOPIC0, pad(toHex(block * 1000 + index)), pad(ARBITRABLE)],
    transactionHash: transactionHash ?? pad(toHex(block * 1000 + index), { size: 32 }),
    transactionIndex: "0x0",
  };
}

interface Filter {
  readonly fromBlock: bigint;
  readonly toBlock: bigint;
  readonly topics: readonly unknown[];
  readonly address: unknown;
}

/**
 * A node holding `logs` that refuses an eth_getLogs over more than `maxSpan` blocks (Infura's wording), or answers
 * through `answer` when given: an Error is the node's error, a promise is an answer that comes later, undefined falls
 * through.
 */
function node(
  logs: readonly FakeLog[],
  options: { maxSpan?: number; answer?: (filter: Filter, n: number) => unknown } = {},
) {
  const requests: Filter[] = [];
  const client = customClient((method, params) => {
    if (method !== "eth_getLogs") return Promise.reject(rpcError(-32601, `unexpected ${method}`));
    const raw = params[0] as { fromBlock: string; toBlock: string; topics: unknown[]; address: unknown };
    const filter = { ...raw, fromBlock: BigInt(raw.fromBlock), toBlock: BigInt(raw.toBlock) };
    requests.push(filter);
    if (options.answer) {
      const answered = options.answer(filter, requests.length);
      if (answered !== undefined)
        return answered instanceof Error ? Promise.reject(answered) : Promise.resolve(answered);
    }
    if (options.maxSpan !== undefined && filter.toBlock - filter.fromBlock + 1n > BigInt(options.maxSpan))
      return Promise.reject(rpcError(-32005, "query returned more than 10000 results"));
    const inRange = logs.filter((log) => BigInt(log.block) >= filter.fromBlock && BigInt(log.block) <= filter.toBlock);
    return Promise.resolve(inRange.map(rpcLog));
  });
  const spans = () => requests.map((r) => [Number(r.fromBlock), Number(r.toBlock)]);
  return { client, requests, spans };
}

function request(fromBlock: number, toBlock: number) {
  return {
    address: KLEROS_LIQUID,
    event: DISPUTE_CREATION,
    fromBlock: BigInt(fromBlock),
    toBlock: BigInt(toBlock),
  } as const;
}

const positions = (logs: readonly { blockNumber: bigint; logIndex: number }[]) =>
  logs.map((log) => [Number(log.blockNumber), log.logIndex]);

/** `value` as an answer that arrives 2 s after the request (the tests using it run on fake timers). */
const inTwoSeconds = (value: unknown) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, 2_000);
  });

describe("getLogsChunked", () => {
  it("asks for the whole range first, with the event's filter, and keeps it when the node answers", async () => {
    const { client, requests, spans } = node([
      { block: 30_000, index: 2 },
      { block: 120, index: 0 },
    ]);
    const outcome = await getLogsChunked(client, request(100, 30_000));
    expect(spans()).toEqual([[100, 30_000]]);
    expect(requests[0]?.topics[0]).toBe(TOPIC0);
    expect(requests[0]?.address).toBe(KLEROS_LIQUID);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(positions(outcome.value.logs)).toEqual([
      [120, 0],
      [30_000, 2],
    ]);
    expect(outcome.value.logs[0]?.args._arbitrable?.toLowerCase()).toBe(ARBITRABLE);
    expect(outcome.value).toMatchObject({ scannedFrom: 100n, scannedTo: 30_000n, stoppedEarly: false });
  });

  it("splits a refused range into 10,000-block windows, oldest first by default", async () => {
    const logs = [
      { block: 5, index: 0 },
      { block: 15_000, index: 1 },
      { block: 25_000, index: 0 },
    ];
    const { client, spans } = node(logs, { maxSpan: 10_000 });
    const outcome = await getLogsChunked(client, request(0, 25_000));
    expect(spans()).toEqual([
      [0, 25_000],
      [0, 9_999],
      [10_000, 19_999],
      [20_000, 25_000],
    ]);
    expect(outcome.ok && positions(outcome.value.logs)).toEqual([
      [5, 0],
      [15_000, 1],
      [25_000, 0],
    ]);
    expect(outcome.ok && outcome.value.stoppedEarly).toBe(false);
  });

  it("scans newest first with order desc and returns the logs newest first", async () => {
    const logs = [
      { block: 5, index: 0 },
      { block: 15_000, index: 1 },
      { block: 15_000, index: 4 },
    ];
    const { client, spans } = node(logs, { maxSpan: 10_000 });
    const outcome = await getLogsChunked(client, request(0, 25_000), { order: "desc" });
    expect(spans()).toEqual([
      [0, 25_000],
      [15_001, 25_000],
      [5_001, 15_000],
      [0, 5_000],
    ]);
    expect(outcome.ok && positions(outcome.value.logs)).toEqual([
      [15_000, 4],
      [15_000, 1],
      [5, 0],
    ]);
  });

  it("shrinks refused windows by 5 (10,000, 2,000, 400, 100), restarting at the refused window, and covers every block once", async () => {
    const logs = Array.from({ length: 13 }, (_, i) => ({ block: i * 2_000 + 1, index: 0 }));
    const { client, spans } = node(logs, { maxSpan: 2_000 });
    const outcome = await getLogsChunked(client, request(0, 25_000));
    const answered = spans().filter(([from = 0, to = 0]) => to - from + 1 <= 2_000);
    expect(spans().slice(0, 4)).toEqual([
      [0, 25_000],
      [0, 9_999],
      [10_000, 19_999],
      [20_000, 25_000],
    ]);
    expect(answered[0]).toEqual([0, 1_999]);
    expect(answered.reduce((blocks, [from = 0, to = 0]) => blocks + to - from + 1, 0)).toBe(25_001);
    expect(outcome.ok && outcome.value.logs).toHaveLength(13);
  });

  it("starts the windows below the refused range's size, and fails when even a 100-block window is refused", async () => {
    const { client, spans } = node([], { maxSpan: 50 });
    const outcome = await getLogsChunked(client, request(0, 499));
    expect(spans().slice(0, 3)).toEqual([
      [0, 499],
      [0, 399],
      [400, 499],
    ]);
    expect(spans()).toContainEqual([0, 99]);
    expect(spans().every(([from = 0, to = 0]) => to - from + 1 <= 500)).toBe(true);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure).toMatchObject({ kind: "unavailable", reason: "rpc-error" });
  });

  it("fails at once when a range of 100 blocks or fewer is refused (it cannot be split into allowed windows)", async () => {
    for (const [from, to] of [
      [7, 7],
      [0, 99],
    ] as const) {
      const { client, spans } = node([], { maxSpan: 0 });
      const outcome = await getLogsChunked(client, request(from, to));
      expect(spans()).toEqual([[from, to]]);
      expect(outcome.ok).toBe(false);
    }
  });

  it("retries a timed-out whole range once before splitting it", async () => {
    const timeout = new TimeoutError({ body: {}, url: "https://rpc.invalid/key" });
    const slow = node([{ block: 3, index: 0 }], { maxSpan: 10_000, answer: (_f, n) => (n <= 2 ? timeout : undefined) });
    const outcome = await getLogsChunked(slow.client, request(0, 15_000));
    expect(slow.spans()).toEqual([
      [0, 15_000],
      [0, 15_000],
      [0, 9_999],
      [10_000, 15_000],
    ]);
    expect(outcome.ok && outcome.value.logs).toHaveLength(1);

    const once = node([{ block: 3, index: 0 }], { answer: (_f, n) => (n === 1 ? timeout : undefined) });
    const retried = await getLogsChunked(once.client, request(0, 15_000));
    expect(once.spans()).toEqual([
      [0, 15_000],
      [0, 15_000],
    ]);
    expect(retried.ok && retried.value.stoppedEarly).toBe(false);
  });

  it("fails without splitting when the whole range fails for another reason, or a window does", async () => {
    const notFound = rpcError(-32000, "header not found");
    const whole = node([], { answer: () => notFound });
    const failed = await getLogsChunked(whole.client, request(0, 25_000));
    expect(whole.spans()).toEqual([[0, 25_000]]);
    expect(!failed.ok && failed.failure).toMatchObject({ kind: "unavailable", reason: "rpc-error" });

    const window = node([], { maxSpan: 10_000, answer: (f) => (f.fromBlock === 10_000n ? notFound : undefined) });
    const windowFailed = await getLogsChunked(window.client, request(0, 25_000));
    expect(windowFailed.ok).toBe(false);
  });

  it("an error answer whose code cannot become text is unavailable rpc-error, never a rejection", async () => {
    // Through viem's http transport, which copies the answer's code as sent (the read client retries it first).
    vi.useFakeTimers();
    const { fetchFn } = fakeRpc(() => ({ error: { code: { toString: 1 }, message: "x" } }));
    const client = createReadClient("https://rpc.example.org/", 1, { timeoutMs: 50, fetchFn });
    const settled = getLogsChunked(client, request(0, 25_000)).catch((error: unknown) => ({ rejected: String(error) }));
    await vi.runAllTimersAsync();
    expect(await settled).toEqual({
      ok: false,
      failure: { kind: "unavailable", reason: "rpc-error", message: "Could not read the logs: The request failed." },
    });
  });

  it("with stopAtFirstNonEmptyWindow and order desc, returns only the newest window holding logs and where it starts", async () => {
    const { client } = node(
      [
        { block: 3_000, index: 0 },
        { block: 12_000, index: 7 },
      ],
      { maxSpan: 10_000 },
    );
    const outcome = await getLogsChunked(client, request(0, 25_000), {
      order: "desc",
      stopAtFirstNonEmptyWindow: true,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(positions(outcome.value.logs)).toEqual([[12_000, 7]]);
    expect(outcome.value).toMatchObject({ scannedFrom: 5_001n, scannedTo: 25_000n, stoppedEarly: true });
  });

  it("with stopAtFirstNonEmptyWindow, an answered whole range is one window: all its logs come back", async () => {
    const { client } = node([
      { block: 3_000, index: 0 },
      { block: 12_000, index: 7 },
    ]);
    const outcome = await getLogsChunked(client, request(0, 25_000), {
      order: "desc",
      stopAtFirstNonEmptyWindow: true,
    });
    expect(outcome.ok && positions(outcome.value.logs)).toEqual([
      [12_000, 7],
      [3_000, 0],
    ]);
    expect(outcome.ok && outcome.value.stoppedEarly).toBe(false);
  });

  it("maxLogs stops at the window boundary where the count reaches it, never inside a window", async () => {
    const logs = [0, 1, 2].flatMap((w) => [1, 2, 3].map((i) => ({ block: w * 10_000 + i, index: 0 })));
    const { client } = node(logs, { maxSpan: 10_000 });
    const outcome = await getLogsChunked(client, request(0, 29_999), { maxLogs: 5 });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.logs).toHaveLength(6);
    expect(outcome.value).toMatchObject({ scannedFrom: 0n, scannedTo: 19_999n, stoppedEarly: true });
  });

  it("maxLogs: an answered whole range comes back whole, even over the cap", async () => {
    const { client } = node(Array.from({ length: 7 }, (_, i) => ({ block: i + 1, index: 0 })));
    const outcome = await getLogsChunked(client, request(0, 29_999), { maxLogs: 5 });
    expect(outcome.ok && outcome.value.logs).toHaveLength(7);
    expect(outcome.ok && outcome.value.stoppedEarly).toBe(false);
  });

  it("drops removed logs and duplicates by (transaction, log index), and sorts by block then log index", async () => {
    const { client } = node([], {
      answer: () => [
        rpcLog({ block: 9, index: 1 }),
        rpcLog({ block: 2, index: 5 }),
        rpcLog({ block: 9, index: 0 }),
        rpcLog({ block: 2, index: 5 }),
        rpcLog({ block: 4, index: 0, removed: true }),
      ],
    });
    const outcome = await getLogsChunked(client, request(0, 10));
    expect(outcome.ok && positions(outcome.value.logs)).toEqual([
      [2, 5],
      [9, 0],
      [9, 1],
    ]);
  });

  it("keeps two logs of one transaction, and drops a repeat of the same (transaction, log index)", async () => {
    const transactionHash = pad(toHex(0xabcdef), { size: 32 });
    const { client } = node([], {
      answer: () => [
        rpcLog({ block: 7, index: 0, transactionHash }),
        rpcLog({ block: 7, index: 1, transactionHash }),
        rpcLog({ block: 7, index: 1, transactionHash }),
      ],
    });
    const outcome = await getLogsChunked(client, request(0, 10));
    expect(outcome.ok && outcome.value.logs.map((log) => [log.transactionHash, log.logIndex])).toEqual([
      [transactionHash, 0],
      [transactionHash, 1],
    ]);
  });

  it("a window holding only removed logs is empty: the newest window with a kept log is returned", async () => {
    const { client } = node(
      [
        { block: 25_000, index: 0, removed: true },
        { block: 5_000, index: 0 },
      ],
      { maxSpan: 10_000 },
    );
    const outcome = await getLogsChunked(client, request(1, 30_000), {
      order: "desc",
      stopAtFirstNonEmptyWindow: true,
    });
    expect(outcome.ok && positions(outcome.value.logs)).toEqual([[5_000, 0]]);
    expect(outcome.ok && outcome.value).toMatchObject({ scannedFrom: 1n, scannedTo: 30_000n });
  });

  it("maxLogs counts only the logs kept (removed ones are not)", async () => {
    const logs = [
      { block: 1, index: 0, removed: true },
      { block: 2, index: 0, removed: true },
      { block: 10_001, index: 0 },
      { block: 20_001, index: 0 },
    ];
    const { client } = node(logs, { maxSpan: 10_000 });
    const outcome = await getLogsChunked(client, request(0, 29_999), { maxLogs: 2 });
    expect(outcome.ok && positions(outcome.value.logs)).toEqual([
      [10_001, 0],
      [20_001, 0],
    ]);
  });

  it("a window refused inside a batch drops the rest of the batch, read again later: every log comes back once", async () => {
    const logs = [
      { block: 5, index: 0 },
      { block: 15_000, index: 0 },
      { block: 22_000, index: 0 },
    ];
    // The whole range and the 10,000-block window at 10,000 are refused; [20,000, 25,000] is answered, then dropped.
    const { client, spans } = node(logs, {
      answer: (f) =>
        f.toBlock - f.fromBlock + 1n > 10_000n || (f.fromBlock === 10_000n && f.toBlock === 19_999n)
          ? rpcError(-32005, "query returned more than 10000 results")
          : undefined,
    });
    const outcome = await getLogsChunked(client, request(0, 25_000));
    expect(spans().slice(0, 4)).toEqual([
      [0, 25_000],
      [0, 9_999],
      [10_000, 19_999],
      [20_000, 25_000],
    ]);
    expect(outcome.ok && positions(outcome.value.logs)).toEqual([
      [5, 0],
      [15_000, 0],
      [22_000, 0],
    ]);
  });

  it("reads a refused range 8 windows at a time, the 8 requests of a batch in flight together", async () => {
    vi.useFakeTimers();
    let inFlight = 0;
    let most = 0;
    const { client, spans } = node([], {
      maxSpan: 10_000,
      answer: (f) => {
        if (f.toBlock - f.fromBlock + 1n > 10_000n) return undefined; // refused through maxSpan
        inFlight += 1;
        most = Math.max(most, inFlight);
        return inTwoSeconds([]).finally(() => {
          inFlight -= 1;
        });
      },
    });
    const pending = getLogsChunked(client, request(0, 199_999));
    await vi.advanceTimersByTimeAsync(60_000);
    expect((await pending).ok).toBe(true);
    expect(spans()).toHaveLength(21); // the whole range, then 20 windows in batches of 8, 8 and 4
    expect(most).toBe(8);
  });

  it.each<[string, Record<string, unknown>]>([
    ["no transaction hash", { transactionHash: null }],
    ["a missing transaction hash", { transactionHash: undefined }],
    ["a transaction hash that is not text", { transactionHash: 5 }],
    ["no block number", { blockNumber: null }],
    ["no log index", { logIndex: null }],
    ["a log index that is not a number", { logIndex: "0xzz" }],
  ])(
    "a log row with %s ends the scan as unavailable rpc-error, on the whole range and in a window",
    async (_name, bad) => {
      const row = { ...rpcLog({ block: 5, index: 0 }), ...bad };
      const whole = node([], { answer: () => [row] });
      const wholeOutcome = await getLogsChunked(whole.client, request(0, 25_000));
      expect(!wholeOutcome.ok && wholeOutcome.failure).toMatchObject({ kind: "unavailable", reason: "rpc-error" });
      expect(whole.spans()).toEqual([[0, 25_000]]);

      const windowed = node([], {
        maxSpan: 10_000,
        answer: (f) => (f.fromBlock === 0n && f.toBlock === 9_999n ? [row] : undefined),
      });
      const windowOutcome = await getLogsChunked(windowed.client, request(0, 25_000));
      expect(!windowOutcome.ok && windowOutcome.failure).toMatchObject({ kind: "unavailable", reason: "rpc-error" });
      // A bad answer is not a refused range: nothing is split further.
      expect(windowed.spans()).toEqual([
        [0, 25_000],
        [0, 9_999],
        [10_000, 19_999],
        [20_000, 25_000],
      ]);
    },
  );

  it("sends the address, the event and the indexed-argument filter with every request, the whole range and each window", async () => {
    const { client, requests, spans } = node([], { maxSpan: 10_000 });
    const outcome = await getLogsChunked(client, {
      ...request(0, 25_000),
      args: { _disputeID: 1047n, _arbitrable: ARBITRABLE },
    });
    expect(outcome.ok).toBe(true);
    expect(spans()).toEqual([
      [0, 25_000],
      [0, 9_999],
      [10_000, 19_999],
      [20_000, 25_000],
    ]);
    for (const sent of requests) {
      expect(sent.address).toBe(KLEROS_LIQUID);
      expect(sent.topics).toEqual([TOPIC0, pad(toHex(1047n)), pad(ARBITRABLE)]);
    }
  });

  it("keeps a log whose data does not decode, with the args its topics carry, so the caller sees it", async () => {
    const metaEvidence = parseAbiItem("event MetaEvidence(uint256 indexed _metaEvidenceID, string _evidence)");
    const topic0 = "0x61606860eb6c87306811e2695215385101daab53bd6ab4e9f9049aead9363c7d";
    const { client } = node([], {
      answer: () => [rpcLog({ block: 8, index: 0, topics: [topic0, pad(toHex(3))], data: "0xdeadbeef" })],
    });
    const outcome = await getLogsChunked(client, {
      address: ARBITRABLE,
      event: metaEvidence,
      args: { _metaEvidenceID: 3n },
      fromBlock: 0n,
      toBlock: 10n,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.logs).toHaveLength(1);
    expect(outcome.value.logs[0]?.args._metaEvidenceID).toBe(3n);
    expect(outcome.value.logs[0]?.args._evidence).toBeUndefined();
  });

  it("an empty range (toBlock before fromBlock) sends nothing", async () => {
    const { client, spans } = node([]);
    const outcome = await getLogsChunked(client, request(10, 9));
    expect(spans()).toEqual([]);
    expect(outcome.ok && outcome.value).toMatchObject({ logs: [], stoppedEarly: false });
  });

  it("an aborted signal stops the scan before the next request: unavailable aborted", async () => {
    const before = node([]);
    const aborted = await getLogsChunked(before.client, request(0, 10), { signal: AbortSignal.abort() });
    expect(before.spans()).toEqual([]);
    expect(!aborted.ok && aborted.failure).toMatchObject({ kind: "unavailable", reason: "aborted" });

    const controller = new AbortController();
    const during = node([], {
      maxSpan: 10_000,
      answer: (_f, n) => {
        if (n === 2) controller.abort();
        return undefined;
      },
    });
    const stopped = await getLogsChunked(during.client, request(0, 100_000), { signal: controller.signal });
    expect(!stopped.ok && stopped.failure).toMatchObject({ reason: "aborted" });
    expect(during.spans()).toHaveLength(9);
  });

  describe("a lookup's window sizes (one state per lookup, passed to each of its scans)", () => {
    const wholeRequests = (spans: number[][], span: number) =>
      spans.filter(([from = 0, to = 0]) => to - from + 1 === span);

    it("a later scan on the same client goes straight to the accepted window size, without the refused whole range", async () => {
      const windows: LogWindows = new WeakMap();
      const { client, spans } = node([{ block: 41_000, index: 0 }], { maxSpan: 2_000 });
      await getLogsChunked(client, request(0, 25_000), { windows });
      const before = spans().length;
      const outcome = await getLogsChunked(client, request(30_000, 55_000), { windows });
      const second = spans().slice(before);
      expect(second[0]).toEqual([30_000, 31_999]);
      expect(second.every(([from = 0, to = 0]) => to - from + 1 <= 2_000)).toBe(true);
      expect(outcome.ok && positions(outcome.value.logs)).toEqual([[41_000, 0]]);
    });

    it("a range that fits in the remembered size is still asked in one request", async () => {
      const windows: LogWindows = new WeakMap();
      const { client, spans } = node([], { maxSpan: 2_000 });
      await getLogsChunked(client, request(0, 25_000), { windows });
      const before = spans().length;
      await getLogsChunked(client, request(100, 1_500), { windows });
      expect(spans().slice(before)).toEqual([[100, 1_500]]);
    });

    it("the size is remembered as soon as the whole range is refused, even when the scan then fails", async () => {
      const windows: LogWindows = new WeakMap();
      let firstScan = true;
      const { client, spans } = node([], {
        maxSpan: 10_000,
        answer: (f) =>
          firstScan && f.fromBlock === 0n && f.toBlock === 9_999n ? rpcError(-32000, "header not found") : undefined,
      });
      const failed = await getLogsChunked(client, request(0, 25_000), { windows });
      expect(failed.ok).toBe(false);
      firstScan = false;
      const before = spans().length;
      await getLogsChunked(client, request(0, 25_000), { windows });
      expect(spans().slice(before)).toEqual([
        [0, 9_999],
        [10_000, 19_999],
        [20_000, 25_000],
      ]);
    });

    it("two scans whose whole range times out ask it twice in all (one retry), not twice per scan", async () => {
      const timeout = new TimeoutError({ body: {}, url: "https://rpc.invalid/key" });
      const windows: LogWindows = new WeakMap();
      const slow = node([], { answer: (f) => (f.toBlock - f.fromBlock + 1n > 10_000n ? timeout : undefined) });
      await getLogsChunked(slow.client, request(0, 15_000), { windows });
      await getLogsChunked(slow.client, request(0, 15_000), { windows });
      expect(wholeRequests(slow.spans(), 15_001)).toHaveLength(2);
    });

    it("each client keeps its own size (a lookup reading two chains)", async () => {
      const windows: LogWindows = new WeakMap();
      const limited = node([], { maxSpan: 2_000 });
      const open = node([]);
      await getLogsChunked(limited.client, request(0, 25_000), { windows });
      await getLogsChunked(open.client, request(0, 25_000), { windows });
      expect(open.spans()).toEqual([[0, 25_000]]);
      const before = limited.spans().length;
      await getLogsChunked(limited.client, request(0, 25_000), { windows });
      expect(wholeRequests(limited.spans().slice(before), 25_001)).toEqual([]);
    });

    it("without a window state nothing is kept: every scan starts with the whole range", async () => {
      const { client, spans } = node([], { maxSpan: 2_000 });
      await getLogsChunked(client, request(0, 25_000));
      await getLogsChunked(client, request(0, 25_000));
      expect(wholeRequests(spans(), 25_001)).toHaveLength(2);
    });
  });

  it("a spent request budget ends the scan as unavailable budget-exhausted", async () => {
    const budget = createRequestBudget({ maxRequests: 3, deadlineMs: 60_000 });
    const { client } = node([], { maxSpan: 10_000 });
    const outcome = await getLogsChunked(withBudget(client, budget), request(0, 100_000));
    expect(!outcome.ok && outcome.failure).toMatchObject({ kind: "unavailable", reason: "budget-exhausted" });
    expect(budget.spent).toBe(3);
  });

  it("80 windows answered in 2 s each end inside a lookup's 1,500 requests / 90 s, read 8 at a time", async () => {
    // The Reality lookup's limits (design parameters). Read one at a time, these windows would take 160 s.
    vi.useFakeTimers();
    const budget = createRequestBudget({ maxRequests: 1_500, deadlineMs: 90_000 });
    const { client, spans } = node([], {
      maxSpan: 10_000,
      answer: (f) =>
        f.toBlock - f.fromBlock + 1n > 10_000n
          ? undefined // refused through maxSpan
          : inTwoSeconds(f.fromBlock === 0n ? [rpcLog({ block: 5, index: 0 })] : []),
    });
    const pending = getLogsChunked(withBudget(client, budget), request(0, 799_999));
    await vi.advanceTimersByTimeAsync(300_000);
    expect(await pending).toEqual({
      ok: true,
      value: {
        logs: [expect.objectContaining({ blockNumber: 5n, logIndex: 0 })],
        scannedFrom: 0n,
        scannedTo: 799_999n,
        stoppedEarly: false,
      },
    });
    expect(spans()).toHaveLength(81);
    expect(budget.spent).toBe(81);
  });
});
