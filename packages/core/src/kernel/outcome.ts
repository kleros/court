import type { Failure, Outcome, RefusedReason, UnavailableReason } from "./types.ts";

export function succeed<T>(value: T): Outcome<T> {
  return { ok: true, value };
}

export function unavailable(reason: UnavailableReason, message: string): Outcome<never> {
  return { ok: false, failure: { kind: "unavailable", reason, message } };
}

export function invalid(reason: string, message: string): Outcome<never> {
  return { ok: false, failure: { kind: "invalid", reason, message } };
}

export function notFound(message: string): Outcome<never> {
  return { ok: false, failure: { kind: "not-found", message } };
}

export function refused(reason: RefusedReason, message: string): Outcome<never> {
  return { ok: false, failure: { kind: "refused", reason, message } };
}

/**
 * Trying again by itself cannot help these: a chain with no RPC stays unconfigured, an abort is the caller's own
 * choice, and a runner that never acknowledged a frame fails the same way again (D-18). A manual Retry is still offered.
 */
const NO_AUTOMATIC_RETRY: ReadonlySet<UnavailableReason> = new Set(["not-configured", "aborted", "script-runner"]);

/** Automatic retry allowed: unavailable except not-configured, aborted and script-runner. (A manual Retry is offered for every unavailable.) */
export function isRetryable(failure: Failure): boolean {
  return failure.kind === "unavailable" && !NO_AUTOMATIC_RETRY.has(failure.reason);
}
