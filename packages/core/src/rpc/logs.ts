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

type ScanOutcome<TEvent extends AbiEvent> = Outcome<ChunkedLogs<TEvent>>;

/** One call of getLogsChunked: what it reads, how, and the logs it kept so far. */
interface Scan<TEvent extends AbiEvent> {
  readonly client: ReadClient;
  readonly request: LogsRequest<TEvent>;
  readonly options: LogsScanOptions;
  readonly order: "asc" | "desc";
  readonly fromBlock: bigint;
  readonly toBlock: bigint;
  readonly span: bigint;
  /** The size `options.windows` remembered for this client when the scan started. */
  readonly remembered: bigint | undefined;
  // Every kept log's (transaction, log index). Some providers return a log twice across ranges, and a reorg can mark
  // one removed (court src/temp/reality-question.js:140-156). Windows are kept one by one in `order`, so the windows of
  // a batch dropped after a refusal are read again with none of their logs marked seen.
  readonly seen: Set<string>;
}

/** The scan's walk through windows once the whole range was refused, or skipped for a remembered size. */
interface Walk<TEvent extends AbiEvent> {
  /** The kept logs of each window read, in `order`. */
  readonly scanned: GetLogsReturnType<TEvent>[];
  /** The first block not scanned yet, in `order`. */
  next: bigint;
  size: bigint;
}

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

  const span = toBlock - fromBlock + 1n;
  const remembered = options.windows?.get(client);
  const scan: Scan<TEvent> = { client, request, options, order, fromBlock, toBlock, span, remembered, seen: new Set() };
  // Every await stays in this function and the helpers are synchronous: an awaited helper adds microtask turns before
  // the next request, which changes the order in which scans run side by side (and sharing a budget) send theirs.
  let size = rememberedStart(scan);
  if (size === undefined) {
    if (isAborted(options)) return aborted();
    const whole: Window = { from: fromBlock, to: toBlock };
    let first = await read(scan, whole);
    if (isTimedOut(first)) {
      if (isAborted(options)) return aborted();
      first = await read(scan, whole);
    }
    const start = afterWholeRange(scan, whole, first);
    if ("outcome" in start) return start.outcome;
    size = start.size;
  }
  options.windows?.set(client, size);

  const walk: Walk<TEvent> = { scanned: [], next: order === "asc" ? fromBlock : toBlock, size };
  let ended = beforeBatch(scan, walk);
  while (ended === null) {
    const batch = windowsFrom(walk.next, walk.size, order, fromBlock, toBlock);
    const answers = await Promise.all(batch.map((window) => read(scan, window)));
    ended = keepBatch(scan, walk, batch, answers) ?? beforeBatch(scan, walk);
  }
  return ended;
}

/** The remembered size when the range is larger than it: the walk then starts there, without the whole range. */
function rememberedStart<TEvent extends AbiEvent>(scan: Scan<TEvent>): bigint | undefined {
  return scan.remembered !== undefined && scan.span > scan.remembered ? scan.remembered : undefined;
}

function isTimedOut<TEvent extends AbiEvent>(answer: Answer<TEvent>): boolean {
  return "error" in answer && isTimeoutError(answer.error);
}

/**
 * The scan's outcome when the whole range was answered or failed. Else the node refused it whole, and the walk starts
 * at the first size below the range.
 */
function afterWholeRange<TEvent extends AbiEvent>(
  scan: Scan<TEvent>,
  whole: Window,
  first: Answer<TEvent>,
): { readonly size: bigint } | { readonly outcome: ScanOutcome<TEvent> } {
  if ("logs" in first) {
    const kept = keep(scan, first.logs);
    return { outcome: kept === null ? malformed() : succeed(result([kept], whole, scan.request, scan.order)) };
  }
  if (!isRangeLimitError(first.error)) return { outcome: failed(first.error) };
  // The whole range was refused, so windows start at the first size below it.
  const size = sizeBelow(scan.remembered ?? FIRST_WINDOW, scan.span);
  return size === null ? { outcome: failed(first.error) } : { size };
}

/** `size` shrunk until it is below `span`, but not below 100 blocks; null when even that is not below `span`. */
function sizeBelow(size: bigint, span: bigint): bigint | null {
  let below = size;
  while (below >= span && below > SMALLEST_WINDOW) below = shrink(below);
  return below >= span ? null : below;
}

/** Before each batch: the scan's outcome once every window was read, or when the signal was aborted; else null. */
function beforeBatch<TEvent extends AbiEvent>(scan: Scan<TEvent>, walk: Walk<TEvent>): ScanOutcome<TEvent> | null {
  if (walkedAll(scan, walk)) return succeed(result(walk.scanned, covered(scan, walk), scan.request, scan.order));
  return isAborted(scan.options) ? aborted() : null;
}

/**
 * Keeps a batch's windows one by one in `order`. Returns the scan's outcome when it ends here (a failure, a bad log row
 * or a stop option), else null: the batch was kept, or a refused window shrank the size and the walk goes on from it.
 */
function keepBatch<TEvent extends AbiEvent>(
  scan: Scan<TEvent>,
  walk: Walk<TEvent>,
  batch: readonly Window[],
  answers: readonly Answer<TEvent>[],
): ScanOutcome<TEvent> | null {
  for (const [i, window] of batch.entries()) {
    const answer = answers[i];
    if (answer === undefined) break;
    if ("error" in answer) return shrinkAfterRefusal(scan, walk, window, answer.error);
    const kept = keep(scan, answer.logs);
    if (kept === null) return malformed();
    walk.scanned.push(kept);
    walk.next = scan.order === "asc" ? window.to + 1n : window.from - 1n;
    if (reachedStop(scan, kept)) return succeed(result(walk.scanned, covered(scan, walk), scan.request, scan.order));
  }
  return null;
}

/**
 * A refused window shrinks the size for the rest of the scan and in `options.windows`. Any other failure, or a refused
 * 100-block window or single block, fails the scan.
 */
function shrinkAfterRefusal<TEvent extends AbiEvent>(
  scan: Scan<TEvent>,
  walk: Walk<TEvent>,
  window: Window,
  error: unknown,
): ScanOutcome<TEvent> | null {
  if (!isRangeLimitError(error) || walk.size <= SMALLEST_WINDOW || window.from === window.to) return failed(error);
  walk.size = shrink(walk.size);
  scan.options.windows?.set(scan.client, walk.size);
  return null; // the rest of the batch is dropped; the scan restarts at this window with the smaller size
}

/** The stop options, after a kept window: they count kept logs only. */
function reachedStop<TEvent extends AbiEvent>(scan: Scan<TEvent>, kept: GetLogsReturnType<TEvent>): boolean {
  return (
    (scan.options.stopAtFirstNonEmptyWindow === true && kept.length > 0) ||
    (scan.options.maxLogs !== undefined && scan.seen.size >= scan.options.maxLogs)
  );
}

function walkedAll<TEvent extends AbiEvent>(scan: Scan<TEvent>, walk: Walk<TEvent>): boolean {
  return scan.order === "asc" ? walk.next > scan.toBlock : walk.next < scan.fromBlock;
}

/** The blocks the walk has scanned: from the range's end it started at, up to the block before `next`. */
function covered<TEvent extends AbiEvent>(scan: Scan<TEvent>, walk: Walk<TEvent>): Window {
  return scan.order === "asc"
    ? { from: scan.fromBlock, to: walk.next - 1n }
    : { from: walk.next + 1n, to: scan.toBlock };
}

async function read<TEvent extends AbiEvent>(scan: Scan<TEvent>, window: Window): Promise<Answer<TEvent>> {
  const { client, request } = scan;
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
}

/** The logs that are not removed and not kept before, marked seen; null when a row lacks its position. */
function keep<TEvent extends AbiEvent>(
  scan: Scan<TEvent>,
  logs: GetLogsReturnType<TEvent>,
): GetLogsReturnType<TEvent> | null {
  if (!logs.every(hasPosition)) return null;
  return logs.filter((log) => {
    const key = `${log.transactionHash.toLowerCase()}:${String(log.logIndex)}`;
    if (log.removed || scan.seen.has(key)) return false;
    scan.seen.add(key);
    return true;
  });
}

function isAborted(options: LogsScanOptions): boolean {
  return options.signal?.aborted === true;
}

function aborted(): Outcome<never> {
  return unavailable("aborted", "The log scan was aborted.");
}

function failed(error: unknown): Outcome<never> {
  return { ok: false, failure: toReadFailure(error, "the logs") };
}

function malformed(): Outcome<never> {
  return unavailable("rpc-error", "Could not read the logs: the RPC answered a log without its position in the chain.");
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

/** Ascending by block, then by log index within a block. */
function byPosition(
  a: { readonly blockNumber: bigint; readonly logIndex: number },
  b: { readonly blockNumber: bigint; readonly logIndex: number },
): number {
  if (a.blockNumber === b.blockNumber) return a.logIndex - b.logIndex;
  return a.blockNumber < b.blockNumber ? -1 : 1;
}

/** `scanned`: the kept logs of each window read, which together cover exactly `covered`. */
function result<TEvent extends AbiEvent>(
  scanned: readonly GetLogsReturnType<TEvent>[],
  covered: Window,
  request: LogsRequest<TEvent>,
  order: "asc" | "desc",
): ChunkedLogs<TEvent> {
  const logs = scanned.flat().sort((a, b) => (order === "asc" ? byPosition(a, b) : -byPosition(a, b)));
  return {
    logs,
    scannedFrom: covered.from,
    scannedTo: covered.to,
    stoppedEarly: covered.from !== request.fromBlock || covered.to !== request.toBlock,
  };
}
