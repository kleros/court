import type { AbiEvent, GetLogsReturnType } from "viem";
import { succeed, unavailable, type Outcome, type ReadClient } from "../kernel/index.ts";
import { isRangeLimitError, isTimeoutError, toReadFailure } from "./errors.ts";
import type { ChunkedLogs, LogsRequest, LogsScanOptions } from "./types.ts";

// Today's windows (court src/temp/reality-question.js:40-49): 10,000 blocks, shrunk by 5 down to 100, 8 at a time.
const FIRST_WINDOW = 10_000n;
const SMALLEST_WINDOW = 100n;
const SHRINK = 5n;
const PARALLEL_WINDOWS = 8;

interface Window {
  readonly from: bigint;
  readonly to: bigint;
}

type Answer<TEvent extends AbiEvent> = { readonly logs: GetLogsReturnType<TEvent> } | { readonly error: unknown };

/**
 * Every log matching `request` in [fromBlock, toBlock]. The whole range is asked in one request first, unless
 * `options.windows` remembers a smaller accepted size for this client: then the scan goes straight to windows of that
 * size. A timed-out whole range is asked once more before splitting it (one slow answer should not send a lookup into
 * small windows). When the node refuses the range, it is read in windows walked in `order`, 8 at a time, each refused
 * window shrinking the size (10,000 / 5 down to 100) for the rest of this scan and in `options.windows`; a refused
 * 100-block window or single block fails the scan. Any other failure fails it too (the read client already retried it),
 * and so does a log row without its transaction hash, block number or log index. A window keeps its logs that are not
 * removed and not kept before (by transaction and log index); the stop options count kept logs only. Logs come back
 * sorted in `order`. Never rejects.
 */
export async function getLogsChunked<const TEvent extends AbiEvent>(
  client: ReadClient,
  request: LogsRequest<TEvent>,
  options: LogsScanOptions = {},
): Promise<Outcome<ChunkedLogs<TEvent>>> {
  const { fromBlock, toBlock } = request;
  const order = options.order ?? "asc";
  if (toBlock < fromBlock)
    return succeed({ logs: [], scannedFrom: fromBlock, scannedTo: toBlock, stoppedEarly: false });

  const read = async (window: Window): Promise<Answer<TEvent>> => {
    try {
      const logs = await client.getLogs({
        address: request.address,
        event: request.event,
        args: request.args,
        fromBlock: window.from,
        toBlock: window.to,
      });
      return { logs };
    } catch (error) {
      return { error };
    }
  };
  const isAborted = () => options.signal?.aborted === true;
  const aborted = () => unavailable("aborted", "The log scan was aborted.");
  const failed = (error: unknown) => ({ ok: false, failure: toReadFailure(error, "the logs") }) as const;
  const malformed = () =>
    unavailable("rpc-error", "Could not read the logs: the RPC answered a log without its position in the chain.");

  // `seen`: every kept log's (transaction, log index). Some providers return a log twice across ranges, and a reorg can
  // mark one removed (court src/temp/reality-question.js:140-156). Windows are kept one by one in `order`, so the windows
  // of a batch dropped after a refusal are read again with none of their logs marked seen.
  const seen = new Set<string>();
  const keep = (logs: GetLogsReturnType<TEvent>): GetLogsReturnType<TEvent> | null => {
    if (!logs.every(hasPosition)) return null;
    return logs.filter((log) => {
      const key = `${log.transactionHash.toLowerCase()}:${String(log.logIndex)}`;
      if (log.removed || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const span = toBlock - fromBlock + 1n;
  const remembered = options.windows?.get(client);
  let size: bigint;
  if (remembered === undefined || span <= remembered) {
    if (isAborted()) return aborted();
    const whole: Window = { from: fromBlock, to: toBlock };
    let first = await read(whole);
    if ("error" in first && isTimeoutError(first.error)) {
      if (isAborted()) return aborted();
      first = await read(whole);
    }
    if ("logs" in first) {
      const kept = keep(first.logs);
      return kept === null ? malformed() : succeed(result([kept], whole, request, order));
    }
    if (!isRangeLimitError(first.error)) return failed(first.error);
    // The whole range was refused, so windows start at the first size below it.
    size = remembered ?? FIRST_WINDOW;
    while (size >= span && size > SMALLEST_WINDOW) size = shrink(size);
    if (size >= span) return failed(first.error);
  } else {
    size = remembered;
  }
  options.windows?.set(client, size);

  const scanned: GetLogsReturnType<TEvent>[] = [];
  let next = order === "asc" ? fromBlock : toBlock; // the first block not scanned yet, in `order`
  const done = () => (order === "asc" ? next > toBlock : next < fromBlock);
  const covered = (): Window =>
    order === "asc" ? { from: fromBlock, to: next - 1n } : { from: next + 1n, to: toBlock };
  while (!done()) {
    if (isAborted()) return aborted();
    const batch = windowsFrom(next, size, order, fromBlock, toBlock);
    const answers = await Promise.all(batch.map(read));
    for (const [i, window] of batch.entries()) {
      const answer = answers[i];
      if (answer === undefined) break;
      if ("error" in answer) {
        if (!isRangeLimitError(answer.error) || size <= SMALLEST_WINDOW || window.from === window.to)
          return failed(answer.error);
        size = shrink(size);
        options.windows?.set(client, size);
        break; // the rest of the batch is dropped; the scan restarts at this window with the smaller size
      }
      const kept = keep(answer.logs);
      if (kept === null) return malformed();
      scanned.push(kept);
      next = order === "asc" ? window.to + 1n : window.from - 1n;
      const stop =
        (options.stopAtFirstNonEmptyWindow === true && kept.length > 0) ||
        (options.maxLogs !== undefined && seen.size >= options.maxLogs);
      if (stop) return succeed(result(scanned, covered(), request, order));
    }
  }
  return succeed(result(scanned, covered(), request, order));
}

/** viem passes a node's log position fields through unchecked; a row without them is an answer nothing can use. */
function hasPosition(log: {
  readonly transactionHash: unknown;
  readonly blockNumber: unknown;
  readonly logIndex: unknown;
}): boolean {
  return (
    typeof log.transactionHash === "string" && typeof log.blockNumber === "bigint" && Number.isSafeInteger(log.logIndex)
  );
}

function shrink(size: bigint): bigint {
  const smaller = size / SHRINK;
  return smaller < SMALLEST_WINDOW ? SMALLEST_WINDOW : smaller;
}

/** Up to 8 windows of `size` from `start`, walking in `order` and clipped to the request range. */
function windowsFrom(start: bigint, size: bigint, order: "asc" | "desc", fromBlock: bigint, toBlock: bigint): Window[] {
  const windows: Window[] = [];
  let edge = start;
  while (windows.length < PARALLEL_WINDOWS && edge >= fromBlock && edge <= toBlock) {
    if (order === "asc") {
      const to = edge + size - 1n > toBlock ? toBlock : edge + size - 1n;
      windows.push({ from: edge, to });
      edge = to + 1n;
    } else {
      const from = edge - size + 1n < fromBlock ? fromBlock : edge - size + 1n;
      windows.push({ from, to: edge });
      edge = from - 1n;
    }
  }
  return windows;
}

/** `scanned`: the kept logs of each window read, which together cover exactly `covered`. */
function result<TEvent extends AbiEvent>(
  scanned: readonly GetLogsReturnType<TEvent>[],
  covered: Window,
  request: LogsRequest<TEvent>,
  order: "asc" | "desc",
): ChunkedLogs<TEvent> {
  const logs = scanned.flat().sort((a, b) => {
    const byPosition =
      a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1;
    return order === "asc" ? byPosition : -byPosition;
  });
  return {
    logs,
    scannedFrom: covered.from,
    scannedTo: covered.to,
    stoppedEarly: covered.from !== request.fromBlock || covered.to !== request.toBlock,
  };
}
