import type { ScriptRunResult } from "@court/core";
import { ACCEPTED_MESSAGE_TYPE, ERROR_MESSAGE_TYPE, RESULT_MESSAGE_TYPE } from "../protocol";

/** Untrusted text from a script is bounded before it becomes part of a message. */
const MAX_SCRIPT_MESSAGE_LENGTH = 300;

type FailureReason = Extract<ScriptRunResult, { status: "failed" }>["reason"];

/** A failure the host decides itself (timeout, abort, a runner that never started or broke the protocol). */
export function hostFailure(reason: Exclude<FailureReason, "script-error">, message: string): ScriptRunResult {
  return { status: "failed", reason, message, jsonDuplicateKeys: false };
}

export const MALFORMED_REPLY = hostFailure("runner-error", "The script runner sent a malformed reply.");

export type PortMessage =
  { readonly kind: "acknowledged" } | { readonly kind: "settled"; readonly result: ScriptRunResult };

const MALFORMED: PortMessage = { kind: "settled", result: MALFORMED_REPLY };

/**
 * A port message (structured-cloned, so plain data) read field by field. The acknowledgement carries nothing; a result's
 * value stays `unknown`: the case-file pipeline checks it once it is merged.
 */
export function parsePortMessage(data: unknown): PortMessage {
  if (typeof data !== "object" || data === null) return MALFORMED;
  const type: unknown = Reflect.get(data, "type");
  if (type === ACCEPTED_MESSAGE_TYPE) return { kind: "acknowledged" };
  const jsonDuplicateKeys: unknown = Reflect.get(data, "jsonDuplicateKeys");
  if (typeof jsonDuplicateKeys !== "boolean") return MALFORMED;
  if (type === RESULT_MESSAGE_TYPE) {
    return {
      kind: "settled",
      result: { status: "ok", value: Reflect.get(data, "value") as unknown, jsonDuplicateKeys },
    };
  }
  const message: unknown = Reflect.get(data, "message");
  if (type !== ERROR_MESSAGE_TYPE || typeof message !== "string") return MALFORMED;
  return {
    kind: "settled",
    result: {
      status: "failed",
      reason: "script-error",
      message: `The dynamic script failed: ${message.slice(0, MAX_SCRIPT_MESSAGE_LENGTH)}`,
      jsonDuplicateKeys,
    },
  };
}
