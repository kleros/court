import {
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  type Hex,
  type Transaction,
  type TransactionReceipt,
} from "viem";
import { succeed, unavailable, type Outcome, type ReadClient } from "../kernel/index.ts";
import type { ReceiptResult } from "./types.ts";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The receipt of `hash`, read through the read client (never the wallet) every `pollMs` until `timeoutMs` (design
 * parameters: 10 min, every 4 s). A wallet can replace the transaction (speed up, cancel) with another of the same
 * sender and nonce, and the node then drops it: once the read client has returned the sent transaction, every block from
 * then on is searched for such a replacement, whose receipt comes back marked. A failed read (the node or the network)
 * is asked again at the next poll and the search resumes at the first block not yet searched, so a bad moment never
 * loses a replacement. Past the timeout, even with a read still hanging: unavailable timeout (the outcome is unknown,
 * not failed). Never rejects.
 *
 * Not covered: a read client that never returned the sent transaction (it was replaced before the read RPC saw it) gives
 * no sender and nonce to match, so a replacement is not recognised and the wait ends at the timeout.
 */
export async function waitForReceipt(
  client: ReadClient,
  hash: Hex,
  options: { readonly timeoutMs?: number; readonly pollMs?: number } = {},
): Promise<Outcome<ReceiptResult>> {
  const timeoutMs = options.timeoutMs ?? 600_000;
  const pollMs = options.pollMs ?? 4_000;
  const timedOut = unavailable(
    "timeout",
    `No receipt for the transaction within ${String(Math.round(timeoutMs / 1000))} s.`,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);
  });
  const outcome = await Promise.race([poll(client, hash, pollMs, Date.now() + timeoutMs), expired]);
  clearTimeout(timer);
  return outcome ?? timedOut;
}

/** Reads until the receipt of `hash` or of its replacement comes; null once `deadline` has passed. */
async function poll(
  client: ReadClient,
  hash: Hex,
  pollMs: number,
  deadline: number,
): Promise<Outcome<ReceiptResult> | null> {
  let sent: Transaction | null = null; // once read, its sender and nonce identify a replacement
  let next = 0n; // the first block not yet searched for a replacement
  while (Date.now() < deadline) {
    try {
      const head = await client.getBlockNumber({ cacheTime: 0 });
      const receipt = await unlessMissing(client.getTransactionReceipt({ hash }));
      if (receipt !== null) return succeed(resultOf(receipt));
      if (sent === null) {
        sent = await unlessMissing(client.getTransaction({ hash }));
        next = head; // read after this head, the sent transaction still held its nonce: no replacement mined before
      }
      for (; sent !== null && next <= head && Date.now() < deadline; next += 1n) {
        const replacement = await replacementIn(client, next, sent);
        if (replacement !== null) return succeed(replacement);
      }
    } catch {
      // A failed read: asked again at the next poll. `next` moves past a block only once it was searched in full.
    }
    // Polling: one round at a time, the next one at most `pollMs` after this one ended.
    await sleep(Math.min(pollMs, Math.max(0, deadline - Date.now()))); // NOSONAR
  }
  return null;
}

/** The read's answer, or null when the node answered that it has none (not mined yet, or a hash it does not know). */
async function unlessMissing<T>(read: Promise<T>): Promise<T | null> {
  try {
    return await read;
  } catch (error) {
    if (error instanceof TransactionReceiptNotFoundError || error instanceof TransactionNotFoundError) return null;
    throw error;
  }
}

/** The receipt of a transaction in block `number` with the sent one's sender and nonce but another hash, or null. */
async function replacementIn(client: ReadClient, number: bigint, sent: Transaction): Promise<ReceiptResult | null> {
  const block = await client.getBlock({ blockNumber: number, includeTransactions: true });
  const replacement = block.transactions.find(
    (candidate) =>
      candidate.from.toLowerCase() === sent.from.toLowerCase() &&
      candidate.nonce === sent.nonce &&
      candidate.hash.toLowerCase() !== sent.hash.toLowerCase(),
  );
  if (replacement === undefined) return null;
  const receipt = await client.getTransactionReceipt({ hash: replacement.hash });
  return { ...resultOf(receipt), replaced: sameCall(sent, replacement) ? "repriced" : "cancelled" };
}

/**
 * The same call at a new fee (a speed-up) is "repriced". Anything else, a cancel or another call, means the sent call
 * will never land, so it is "cancelled" (viem's three replacement reasons with its last two folded together).
 */
function sameCall(sent: Transaction, replacement: Transaction): boolean {
  return (
    sent.to?.toLowerCase() === replacement.to?.toLowerCase() &&
    sent.value === replacement.value &&
    sent.input.toLowerCase() === replacement.input.toLowerCase()
  );
}

function resultOf(receipt: TransactionReceipt): ReceiptResult {
  return { status: receipt.status, blockNumber: receipt.blockNumber, hash: receipt.transactionHash };
}
