import { describe, expect, it } from "vitest";
import { invalid, isRetryable, notFound, refused, succeed, unavailable } from "./outcome.ts";
import type { Failure, RefusedReason, UnavailableReason } from "./types.ts";

describe("outcome constructors", () => {
  it("build the one success shape and the four failure shapes", () => {
    expect(succeed(3n)).toEqual({ ok: true, value: 3n });
    expect(unavailable("timeout", "slow")).toEqual({
      ok: false,
      failure: { kind: "unavailable", reason: "timeout", message: "slow" },
    });
    expect(invalid("not-json", "bad")).toEqual({
      ok: false,
      failure: { kind: "invalid", reason: "not-json", message: "bad" },
    });
    expect(notFound("no such case")).toEqual({ ok: false, failure: { kind: "not-found", message: "no such case" } });
    expect(refused("busy", "wait")).toEqual({
      ok: false,
      failure: { kind: "refused", reason: "busy", message: "wait" },
    });
  });
});

describe("isRetryable", () => {
  // Every reason is listed (the Record type forces it), so a reason added later must be placed on one side here.
  const automaticRetry: Record<UnavailableReason, boolean> = {
    network: true,
    timeout: true,
    "http-status": true,
    "empty-reply": true,
    "rpc-error": true,
    "rate-limited": true,
    "budget-exhausted": true,
    "not-yet-indexed": true,
    "script-error": true,
    "script-timeout": true,
    "not-configured": false,
    aborted: false,
    "script-runner": false,
  };

  it.each(Object.entries(automaticRetry))("unavailable %s -> %s", (reason, expected) => {
    const failure = { kind: "unavailable", reason, message: "" } as Failure;
    expect(isRetryable(failure)).toBe(expected);
  });

  it("never retries a bad answer, a confirmed absence or a refusal", () => {
    expect(isRetryable({ kind: "invalid", reason: "schema", message: "" })).toBe(false);
    expect(isRetryable({ kind: "not-found", message: "" })).toBe(false);
    const refusals: RefusedReason[] = [
      "user-rejected",
      "no-wallet",
      "wrong-chain",
      "account-changed",
      "busy",
      "contract-would-revert",
      "insufficient-funds",
      "build-refused",
    ];
    for (const reason of refusals) expect(isRetryable({ kind: "refused", reason, message: "" })).toBe(false);
  });
});
