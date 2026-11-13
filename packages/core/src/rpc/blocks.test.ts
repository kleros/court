import { numberToHex, pad, toHex } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readBlockTimes } from "./blocks.ts";
import { createReadClient } from "./client.ts";
import { customClient, fakeRpc, rpcError } from "./fakeRpc.ts";

afterEach(() => {
  vi.useRealTimers();
});

/** A synthetic block header: timestamp = 1,700,000,000 + the block number. */
function rpcBlock(number: bigint) {
  return {
    number: numberToHex(number),
    hash: pad(toHex(number)),
    parentHash: pad(toHex(number - 1n)),
    timestamp: numberToHex(1_700_000_000n + number),
    nonce: "0x0000000000000000",
    logsBloom: pad("0x", { size: 256 }),
    transactionsRoot: pad("0x"),
    stateRoot: pad("0x"),
    receiptsRoot: pad("0x"),
    miner: "0x0000000000000000000000000000000000000000",
    difficulty: "0x0",
    totalDifficulty: "0x0",
    extraData: "0x",
    size: "0x0",
    gasLimit: "0x0",
    gasUsed: "0x0",
    baseFeePerGas: "0x0",
    sha3Uncles: pad("0x"),
    mixHash: pad("0x"),
    transactions: [],
    uncles: [],
  };
}

function chain(fail: (block: bigint) => boolean = () => false) {
  const asked: bigint[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const client = customClient(async (method, params) => {
    if (method !== "eth_getBlockByNumber") throw rpcError(-32601, `unexpected ${method}`);
    const block = BigInt(params[0] as string);
    asked.push(block);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 1));
    inFlight -= 1;
    if (fail(block)) throw rpcError(-32000, "header not found");
    return rpcBlock(block);
  });
  return { client, asked, maxInFlight: () => maxInFlight };
}

describe("readBlockTimes", () => {
  it("reads each distinct block once and maps it to its Unix time in seconds", async () => {
    const { client, asked } = chain();
    const outcome = await readBlockTimes(client, [7n, 3n, 7n]);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect([...outcome.value.entries()].sort()).toEqual([
      [3n, 1_700_000_003],
      [7n, 1_700_000_007],
    ]);
    expect(asked.sort()).toEqual([3n, 7n]);
  });

  it("keeps at most 6 reads in flight by default, or the concurrency given", async () => {
    const blocks = Array.from({ length: 20 }, (_, i) => BigInt(i + 1));
    const six = chain();
    await readBlockTimes(six.client, blocks);
    expect(six.maxInFlight()).toBe(6);
    const two = chain();
    await readBlockTimes(two.client, blocks, { concurrency: 2 });
    expect(two.maxInFlight()).toBe(2);
  });

  it("any failed read makes the whole answer unavailable, and no more reads start after it", async () => {
    const blocks = Array.from({ length: 30 }, (_, i) => BigInt(i + 1));
    const { client, asked } = chain((block) => block === 2n);
    const outcome = await readBlockTimes(client, blocks);
    expect(!outcome.ok && outcome.failure).toMatchObject({ kind: "unavailable", reason: "rpc-error" });
    expect(asked.length).toBeLessThan(30);
  });

  it("an error answer whose code cannot become text is unavailable rpc-error, never a rejection", async () => {
    // Through viem's http transport, which copies the answer's code as sent (the read client retries it first).
    vi.useFakeTimers();
    const { fetchFn } = fakeRpc(() => ({ error: { code: { toString: 1 }, message: "x" } }));
    const client = createReadClient("https://rpc.example.org/", 1, { timeoutMs: 50, fetchFn });
    const settled = readBlockTimes(client, [1n]).catch((error: unknown) => ({ rejected: String(error) }));
    await vi.runAllTimersAsync();
    expect(await settled).toEqual({
      ok: false,
      failure: {
        kind: "unavailable",
        reason: "rpc-error",
        message: "Could not read the time of block 1: The request failed.",
      },
    });
  });

  it("no blocks: an empty map, nothing sent", async () => {
    const { client, asked } = chain();
    const outcome = await readBlockTimes(client, []);
    expect(outcome.ok && outcome.value.size).toBe(0);
    expect(asked).toEqual([]);
  });
});
