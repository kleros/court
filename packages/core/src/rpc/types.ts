import type { AbiEvent, GetLogsParameters, GetLogsReturnType } from "viem";
import type { Address, Hex, ReadClient } from "../kernel/index.ts";

/** A mined transaction's outcome. `replaced`: the wallet sent another transaction with the same nonce, which mined. */
export interface ReceiptResult {
  readonly status: "success" | "reverted";
  readonly blockNumber: bigint;
  readonly hash: Hex;
  readonly replaced?: "repriced" | "cancelled";
}

/** One per logical lookup (a binding, a Reality lookup), shared by every read client it budgets (withBudget). */
export interface RequestBudget {
  /** Called before every attempt of every request, retries included; throws once maxRequests are spent or the deadline passed. */
  spend(): void;
  /** Attempts spent so far. */
  readonly spent: number;
  /** Milliseconds left before the deadline, never negative. */
  remainingMs(): number;
}

export interface LogsRequest<TEvent extends AbiEvent> {
  readonly address: Address | Address[];
  readonly event: TEvent;
  readonly args?: GetLogsParameters<TEvent>["args"];
  readonly fromBlock: bigint;
  readonly toBlock: bigint;
}

/**
 * One lookup's accepted eth_getLogs window size per read client (so per chain), as today's lookup keeps it on its RPC
 * object (court src/temp/reality-question.js:165-176). A lookup makes one (`new WeakMap()`) and passes it, with the same
 * client per chain, to each of its scans; a later scan then skips a whole range the node would refuse. It dies with the
 * lookup on purpose: a timeout counts as a refusal, so a size kept on a shared client would narrow every later scan.
 */
export type LogWindows = WeakMap<ReadClient, bigint>;

export interface LogsScanOptions {
  readonly signal?: AbortSignal;
  /** Stop at the first window boundary where at least this many logs were kept (never inside a window). */
  readonly maxLogs?: number;
  /** Window order, and the order of the returned logs by (block, log index). Default "asc". */
  readonly order?: "asc" | "desc";
  /** Stop at the first window (in `order`) that holds any kept log. */
  readonly stopAtFirstNonEmptyWindow?: boolean;
  /** The lookup's window sizes, read and written by this scan. Without it nothing is remembered between scans. */
  readonly windows?: LogWindows;
}

/**
 * Every log of the request in [scannedFrom, scannedTo], a contiguous range starting at the `order` end of the request.
 * `stoppedEarly`: the scan stopped (maxLogs or the first non-empty window) before covering the whole request range.
 * Logs are decoded as viem does without `strict`: a log whose data does not decode is kept, with only its topics' args.
 */
export interface ChunkedLogs<TEvent extends AbiEvent> {
  readonly logs: GetLogsReturnType<TEvent>;
  readonly scannedFrom: bigint;
  readonly scannedTo: bigint;
  readonly stoppedEarly: boolean;
}

/** One chain's read RPC as the deploy preflight found it. Reasons never carry the URL or anything the endpoint sent. */
export type PreflightResult =
  | { readonly chainId: number; readonly status: "pass" }
  | { readonly chainId: number; readonly status: "fail"; readonly reason: string }
  | { readonly chainId: number; readonly status: "not-configured" };
