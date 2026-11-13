import { numberToHex, pad, toHex, type Hex } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { customClient, rpcError } from "./fakeRpc.ts";
import { waitForReceipt } from "./receipt.ts";

// Synthetic transactions, receipts and blocks (shapes as nodes answer them); every value is made up. Time is faked and
// the chain gets a block every BLOCK_MS, so each test reads the same chain whatever requests the wait makes.
const SENDER = "0x1111111111111111111111111111111111111111";
const TARGET = "0x2222222222222222222222222222222222222222";
const SENT: Hex = pad("0xaa", { size: 32 });
const REPLACEMENT: Hex = pad("0xbb", { size: 32 });
const FIRST_HEAD = 15;
const BLOCK_MS = 400;
const OPTIONS = { timeoutMs: 60_000, pollMs: 1_000 } as const;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

interface CallFields {
  readonly to?: string;
  readonly value?: bigint;
  readonly input?: Hex;
}

function rpcTransaction(hash: Hex, block: number | null, fields: CallFields = {}) {
  return {
    hash,
    nonce: "0x5",
    blockHash: block === null ? null : pad(toHex(block)),
    blockNumber: block === null ? null : numberToHex(block),
    transactionIndex: block === null ? null : "0x0",
    from: SENDER,
    to: fields.to ?? TARGET,
    value: numberToHex(fields.value ?? 0n),
    gas: "0x5208",
    maxFeePerGas: "0x2",
    maxPriorityFeePerGas: "0x1",
    input: fields.input ?? "0x1234",
    type: "0x2",
    chainId: "0x1",
    accessList: [],
    v: "0x0",
    yParity: "0x0",
    r: "0x1",
    s: "0x1",
  };
}

function rpcReceipt(hash: Hex, status: "0x1" | "0x0", block: number) {
  return {
    blockHash: pad(toHex(block)),
    blockNumber: numberToHex(block),
    contractAddress: null,
    cumulativeGasUsed: "0x5208",
    effectiveGasPrice: "0x2",
    from: SENDER,
    gasUsed: "0x5208",
    logs: [],
    logsBloom: pad("0x", { size: 256 }),
    status,
    to: TARGET,
    transactionHash: hash,
    transactionIndex: "0x0",
    type: "0x2",
  };
}

function rpcBlock(number: number, transactions: unknown[]) {
  return {
    number: numberToHex(number),
    hash: pad(toHex(number)),
    parentHash: pad(toHex(number - 1)),
    timestamp: numberToHex(1_700_000_000 + number),
    nonce: "0x0000000000000000",
    logsBloom: pad("0x", { size: 256 }),
    transactionsRoot: pad("0x"),
    stateRoot: pad("0x"),
    receiptsRoot: pad("0x"),
    miner: "0x0000000000000000000000000000000000000000",
    difficulty: "0x0",
    extraData: "0x",
    size: "0x0",
    gasLimit: "0x0",
    gasUsed: "0x0",
    baseFeePerGas: "0x1",
    sha3Uncles: pad("0x"),
    mixHash: pad("0x"),
    transactions,
    uncles: [],
  };
}

interface Chain {
  /** SENT mines in this block, with this status. */
  readonly mined?: { readonly block: number; readonly status: "0x1" | "0x0" };
  /**
   * A transaction of the same sender and nonce (a wallet's speed-up or cancel) mines alone in `block`; the node serves
   * its receipt from head `receiptFrom` on (default: that block).
   */
  readonly replacement?: { readonly block: number; readonly fields?: CallFields; readonly receiptFrom?: number };
  /** From this head on the node no longer knows SENT (the replacement pushed it out); default: the replacement's block. */
  readonly droppedAt?: number;
  /** Which requests fail at which head (the read RPC has a bad moment). */
  readonly fails?: (method: string, head: number) => boolean;
  /** Receipt requests for SENT never answer. */
  readonly hang?: boolean;
}

/** A node at block 15 whose head moves on every BLOCK_MS; SENT (nonce 5) is pending until `mined`, if ever. */
function chain(options: Chain = {}) {
  const { mined, replacement, fails = () => false } = options;
  const droppedAt = options.droppedAt ?? replacement?.block ?? Infinity;
  const start = Date.now();
  let receiptRequests = 0;
  const client = customClient((method, params) => {
    const head = FIRST_HEAD + Math.floor((Date.now() - start) / BLOCK_MS);
    const asked = params[0];
    if (method === "eth_getTransactionReceipt" && asked === SENT) {
      receiptRequests += 1;
      if (options.hang === true) return new Promise(() => undefined);
    }
    if (fails(method, head)) return Promise.reject(rpcError(-32000, "header not found"));
    const answer = ((): unknown => {
      switch (method) {
        case "eth_blockNumber":
          return numberToHex(head);
        case "eth_getTransactionByHash":
          if (asked !== SENT) return null;
          if (mined !== undefined && head >= mined.block) return rpcTransaction(SENT, mined.block);
          return head >= droppedAt ? null : rpcTransaction(SENT, null);
        case "eth_getTransactionReceipt":
          if (asked === SENT)
            return mined !== undefined && head >= mined.block ? rpcReceipt(SENT, mined.status, mined.block) : null;
          return replacement !== undefined &&
            asked === REPLACEMENT &&
            head >= (replacement.receiptFrom ?? replacement.block)
            ? rpcReceipt(REPLACEMENT, "0x1", replacement.block)
            : null;
        case "eth_getBlockByNumber": {
          const number = Number(BigInt(params[0] as string));
          if (number > head) return null;
          const transactions = [];
          if (mined?.block === number) transactions.push(rpcTransaction(SENT, number));
          if (replacement?.block === number) transactions.push(rpcTransaction(REPLACEMENT, number, replacement.fields));
          return rpcBlock(number, transactions);
        }
        default:
          return rpcError(-32601, `unexpected ${method}`);
      }
    })();
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  });
  return { client, receiptRequests: () => receiptRequests };
}

/** Every request fails at these heads. */
const everything = (heads: readonly number[]) => (_method: string, head: number) => heads.includes(head);
/** Only receipt reads fail at these heads; block numbers, blocks and transactions are answered. */
const receiptReads = (heads: readonly number[]) => (method: string, head: number) =>
  method === "eth_getTransactionReceipt" && heads.includes(head);
/** Only block reads fail at these heads. */
const blockReads = (heads: readonly number[]) => (method: string, head: number) =>
  method === "eth_getBlockByNumber" && heads.includes(head);

/** The wait's outcome once fake time has run for `ms`. */
async function after<T>(ms: number, wait: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(ms);
  return wait;
}

/** Whether `wait` has settled by now (after the pending microtasks ran). */
async function settled(wait: Promise<unknown>): Promise<boolean> {
  const marker = Symbol("pending");
  return (await Promise.race([wait, vi.advanceTimersByTimeAsync(0).then(() => marker)])) !== marker;
}

describe("waitForReceipt", () => {
  it("returns the mined receipt: status, block and hash", async () => {
    const { client } = chain({ mined: { block: 15, status: "0x1" } });
    expect(await after(OPTIONS.timeoutMs, waitForReceipt(client, SENT, OPTIONS))).toEqual({
      ok: true,
      value: { status: "success", blockNumber: 15n, hash: SENT },
    });
  });

  it("a reverted transaction is a receipt with status reverted, not a failure", async () => {
    const { client } = chain({ mined: { block: 15, status: "0x0" } });
    const outcome = await after(OPTIONS.timeoutMs, waitForReceipt(client, SENT, OPTIONS));
    expect(outcome.ok && outcome.value.status).toBe("reverted");
  });

  it("reads the receipt every pollMs while the transaction is pending", async () => {
    const { client, receiptRequests } = chain({ mined: { block: 20, status: "0x1" } });
    const outcome = await after(OPTIONS.timeoutMs, waitForReceipt(client, SENT, OPTIONS));
    expect(outcome.ok && outcome.value.blockNumber).toBe(20n);
    expect(receiptRequests()).toBe(3); // at 0, 1 s and 2 s; block 20 comes at 2 s
  });

  it("keeps waiting through failed reads (the node or the network)", async () => {
    const { client } = chain({ mined: { block: 18, status: "0x1" }, fails: everything([15, 16, 17]) });
    const outcome = await after(OPTIONS.timeoutMs, waitForReceipt(client, SENT, OPTIONS));
    expect(outcome).toEqual({ ok: true, value: { status: "success", blockNumber: 18n, hash: SENT } });
  });

  it("ends at timeoutMs as unavailable timeout when no receipt comes", async () => {
    const { client } = chain({ fails: receiptReads([16, 19, 20]) });
    const wait = waitForReceipt(client, SENT, OPTIONS);
    await vi.advanceTimersByTimeAsync(OPTIONS.timeoutMs - 1);
    expect(await settled(wait)).toBe(false);
    const outcome = await after(1, wait);
    expect(!outcome.ok && outcome.failure).toMatchObject({ kind: "unavailable", reason: "timeout" });
  });

  it("ends at timeoutMs even when a read never answers", async () => {
    const { client } = chain({ hang: true });
    const outcome = await after(OPTIONS.timeoutMs, waitForReceipt(client, SENT, OPTIONS));
    expect(!outcome.ok && outcome.failure).toMatchObject({ kind: "unavailable", reason: "timeout" });
  });

  it("by default waits up to 10 minutes, reading every 4 s", async () => {
    const { client, receiptRequests } = chain();
    const wait = waitForReceipt(client, SENT);
    await vi.advanceTimersByTimeAsync(3_999);
    expect(receiptRequests()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(receiptRequests()).toBe(2);
    await vi.advanceTimersByTimeAsync(600_000 - 4_000 - 1);
    expect(await settled(wait)).toBe(false);
    const outcome = await after(1, wait);
    expect(!outcome.ok && outcome.failure).toMatchObject({ kind: "unavailable", reason: "timeout" });
  });

  it.each([
    ["repriced (same call, new fee)", {}, "repriced"],
    ["cancelled (zero-value send to self)", { to: SENDER, input: "0x" }, "cancelled"],
    ["replaced by another call: the sent call will never land, so cancelled", { input: "0x9999" }, "cancelled"],
  ] as const)("a same-nonce replacement %s returns its receipt, marked", async (_name, fields, replaced) => {
    const { client } = chain({ replacement: { block: 17, fields } });
    const outcome = await after(OPTIONS.timeoutMs, waitForReceipt(client, SENT, OPTIONS));
    expect(outcome).toEqual({
      ok: true,
      value: { status: "success", blockNumber: 17n, hash: REPLACEMENT, replaced },
    });
  });

  describe("a replacement is still found after failed reads (no block is skipped)", () => {
    const found = { ok: true, value: { status: "success", hash: REPLACEMENT, replaced: "repriced" } };

    it("receipt reads failing at the replacement's block", async () => {
      const { client } = chain({ replacement: { block: 20 }, fails: receiptReads([19, 20]) });
      const outcome = await after(OPTIONS.timeoutMs, waitForReceipt(client, SENT, OPTIONS));
      expect(outcome).toMatchObject(found);
      expect(outcome.ok && outcome.value.blockNumber).toBe(20n);
    });

    it("the node dropping the sent transaction blocks before the replacement mines, with a failed read between", async () => {
      // Reads happen at heads 15, 17, 20, 22...: the read at 17 fails, after the node dropped the sent transaction.
      const { client } = chain({ replacement: { block: 21 }, droppedAt: 16, fails: receiptReads([17]) });
      const outcome = await after(OPTIONS.timeoutMs, waitForReceipt(client, SENT, OPTIONS));
      expect(outcome).toMatchObject(found);
      expect(outcome.ok && outcome.value.blockNumber).toBe(21n);
    });

    it.each([
      ["receipt reads failing over several polls", receiptReads([17, 18, 19, 20, 21, 22, 23, 24])],
      ["every request failing over several polls", everything([17, 18, 19, 20, 21, 22, 23, 24])],
      // The receipt read answers, then the block search fails part way: the unsearched blocks are searched next time.
      ["block reads failing over several polls", blockReads([17, 18, 19, 20, 21, 22, 23, 24])],
    ])("%s, the replacement mining meanwhile", async (_name, fails) => {
      const { client } = chain({ replacement: { block: 20 }, fails });
      const outcome = await after(OPTIONS.timeoutMs, waitForReceipt(client, SENT, OPTIONS));
      expect(outcome).toMatchObject(found);
      expect(outcome.ok && outcome.value.blockNumber).toBe(20n);
    });

    it("the replacement's block served before its receipt: that block is searched again until the receipt comes", async () => {
      const { client } = chain({ replacement: { block: 17, receiptFrom: 20 } });
      const outcome = await after(OPTIONS.timeoutMs, waitForReceipt(client, SENT, OPTIONS));
      expect(outcome).toMatchObject(found);
      expect(outcome.ok && outcome.value.blockNumber).toBe(17n);
    });
  });
});
