import { invalid, succeed } from "./outcome.ts";
import { KERNEL_INVALID } from "./reasons.ts";
import type { Outcome } from "./types.ts";

const NOT_A_STRING = KERNEL_INVALID[2];

/** An object as JSON or structured clone makes it: not an array, a date, a map or a class instance. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Only the record's own fields: an inherited member is not part of the data. */
function ownField(record: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

/** The field when it is a string; anything else reads as absent. */
export function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = ownField(record, key);
  return typeof value === "string" ? value : undefined;
}

/**
 * Tells a missing field (ok, undefined) from a field of the wrong type (invalid "not-a-string"), so a parser can flag
 * the bad field instead of treating it as never written. JSON null reads as missing too: it carries no content, so it
 * is not a wrong value to flag.
 */
export function readOptionalString(record: Record<string, unknown>, key: string): Outcome<string | undefined> {
  const value = ownField(record, key);
  if (value === undefined || value === null) return succeed(undefined);
  if (typeof value === "string") return succeed(value);
  return invalid(NOT_A_STRING, `Field "${key}" is not a string.`);
}
