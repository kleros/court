import {
  BaseError,
  ContractFunctionRevertedError,
  ExecutionRevertedError,
  HttpRequestError,
  RpcRequestError,
  TimeoutError,
} from "viem";
import type { Failure } from "../kernel/index.ts";

/**
 * A lookup's request budget ran out (count or deadline). Thrown before the request is sent; never retried and never a
 * range refusal, since splitting the range would only spend more of a budget that is already gone.
 */
export class BudgetExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExhaustedError";
  }
}

/** viem wraps a transport's errors a few times; deeper links are not followed. */
const MAX_CAUSE_DEPTH = 8;

/** The error and its causes, outermost first. */
export function causeChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let link = error;
  while (link !== undefined && link !== null && chain.length < MAX_CAUSE_DEPTH) {
    chain.push(link);
    link = typeof link === "object" && "cause" in link ? link.cause : undefined;
  }
  return chain;
}

function find<T>(error: unknown, test: (link: unknown) => link is T): T | undefined {
  return causeChain(error).find(test);
}

const isBudgetExhausted = (link: unknown): link is BudgetExhaustedError => link instanceof BudgetExhaustedError;
const isAbort = (link: unknown): link is Error => link instanceof Error && link.name === "AbortError";
const isTimeout = (link: unknown): link is TimeoutError => link instanceof TimeoutError;
const isHttpError = (link: unknown): link is HttpRequestError => link instanceof HttpRequestError;
const isRpcRequestError = (link: unknown): link is RpcRequestError => link instanceof RpcRequestError;

export function isBudgetError(error: unknown): boolean {
  return find(error, isBudgetExhausted) !== undefined;
}

export function isTimeoutError(error: unknown): boolean {
  return find(error, isTimeout) !== undefined;
}

/**
 * The node's and viem's words for the failure, for classification only (never shown: an HTTP error's details are the
 * answer's body). viem's full `message` is never read: it repeats the URL and the request body, whose block numbers and
 * topics could match the range wording.
 */
function wording(error: unknown): string {
  return causeChain(error)
    .map((link) => (link instanceof BaseError ? `${link.shortMessage}\n${link.details}` : ""))
    .join("\n");
}

function httpStatus(error: unknown): number | undefined {
  return find(error, isHttpError)?.status;
}

function rpcCode(error: unknown): number | undefined {
  for (const link of causeChain(error)) {
    if (typeof link === "object" && link !== null && "code" in link && typeof link.code === "number") return link.code;
  }
  return undefined;
}

const RATE_LIMIT = /rate[\s-]?limit|too many requests|\b429\b|capacity|throughput|request count|compute units/i;

function isRateLimited(error: unknown): boolean {
  return httpStatus(error) === 429 || RATE_LIMIT.test(wording(error));
}

// Today's classes (court src/temp/reality-question.js:62-75): these codes and words mean the node refuses the size of
// the range or of its answer. Rate limiting reuses some of the words and codes, so it is excluded first. A timeout
// counts: a request too heavy to answer in time would only time out again.
const RANGE_LIMIT_CODES: ReadonlySet<number> = new Set([-32005, -32602, -32600, -32614, 413]);
const RANGE_LIMIT =
  /range|limit|exceed|too many|too large|10[,_]?000|response size|size exceeded|more than|\b413\b|timeout|timed out/i;

/** Whether an eth_getLogs failure is the node refusing the range (split it) rather than a failure to retry or report. */
export function isRangeLimitError(error: unknown): boolean {
  if (isBudgetError(error) || isRateLimited(error)) return false;
  const code = rpcCode(error) ?? httpStatus(error);
  if (code !== undefined && RANGE_LIMIT_CODES.has(code)) return true;
  return RANGE_LIMIT.test(wording(error));
}

/** Words a node uses for an EVM failure of the called code (a revert, or a halt such as an invalid opcode). */
const EVM_FAILURE =
  /execution reverted|\brevert(?:ed)?\b|invalid opcode|InvalidFEOpcode|invalid jump|out of gas|stack (?:underflow|overflow)/i;

/**
 * Revert data is ABI-encoded bytes: hex with at least one byte. viem keeps whatever `data` an error answer carried, and
 * a gateway can put its own failure text there.
 */
const REVERT_DATA = /^0x[0-9a-f]{2,}$/i;

/**
 * Whether a call failed in the contract (a revert or an EVM halt) rather than in the node or on the way. viem reports
 * some node failures as reverts, so the evidence must come from the contract or the node's own words: revert data the
 * contract returned, or an EVM failure the node names. Not a revert: -32603 "Internal error" (with no data, empty 0x
 * data or data that is not hex), an empty 0x answer (no code at the address: a wrong address or chain is a setting, not
 * an absence), and every transport failure. A caller reads "the call reverts" as an answer (e.g. a dispute that does not
 * exist) only when this is true.
 */
export function isContractRevert(error: unknown): boolean {
  return causeChain(error).some(
    (link) =>
      link instanceof ExecutionRevertedError ||
      (link instanceof ContractFunctionRevertedError &&
        (REVERT_DATA.test(link.raw ?? "") || EVM_FAILURE.test(link.reason ?? ""))) ||
      (link instanceof RpcRequestError && EVM_FAILURE.test(link.details)),
  );
}

/**
 * A short description built only from what carries no secret: fixed sentences, the HTTP status and the JSON-RPC code
 * when it is a number. Never the URL (configured RPC URLs carry API keys), the node's own words, the answer's body or
 * the contract's text.
 */
export function describeError(error: unknown): string {
  const budget = find(error, isBudgetExhausted);
  if (budget !== undefined) return budget.message;
  if (find(error, isAbort) !== undefined) return "The request was aborted.";
  if (isContractRevert(error)) return "The contract rejected the call.";
  if (isTimeoutError(error)) return "The request timed out.";
  const status = httpStatus(error);
  if (status !== undefined) return `The RPC answered HTTP ${String(status)}.`;
  if (find(error, isHttpError) !== undefined) return "The RPC could not be reached.";
  // Typed as a number, but viem copies the answer's field as sent: anything else is the node's own data.
  const code: unknown = find(error, isRpcRequestError)?.code;
  if (typeof code === "number") return `The RPC answered with error code ${String(code)}.`;
  return "The request failed.";
}

/**
 * Every read failure is `unavailable` (retry allowed, never shown as bad content), its reason taken from the error.
 * A revert is unavailable too: only the caller knows when its call reverts by design, so it checks isContractRevert
 * first.
 */
export function toReadFailure(error: unknown, what: string): Failure {
  const message = `Could not read ${what}: ${describeError(error)}`;
  const failure = (reason: Extract<Failure, { kind: "unavailable" }>["reason"]): Failure => ({
    kind: "unavailable",
    reason,
    message,
  });
  if (isBudgetError(error)) return failure("budget-exhausted");
  if (find(error, isAbort) !== undefined) return failure("aborted");
  if (isRateLimited(error)) return failure("rate-limited");
  if (isTimeoutError(error)) return failure("timeout");
  if (httpStatus(error) !== undefined) return failure("http-status");
  if (find(error, isHttpError) !== undefined) return failure("network");
  return failure("rpc-error");
}
