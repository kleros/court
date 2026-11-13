import { vi } from "vitest";

// Test support only: never imported by app code.

/**
 * The old app's JSON duplicate-key guard source, as it ships today (P41 keep). The runner only evaluates whatever guard
 * source the caller passes; the app's own copy belongs to core's Reality module, so these tests read the old app's
 * file instead of keeping a second copy.
 */
export async function loadLegacyDuplicateKeyGuard(): Promise<string> {
  const module = await vi.importActual<{ readonly JSON_DUPLICATE_KEY_GUARD: unknown }>(
    "../../../../../legacy/src/temp/json-duplicate-key-guard.js",
  );
  const source = module.JSON_DUPLICATE_KEY_GUARD;
  if (typeof source !== "string") throw new Error("The old app's guard module exports no JSON_DUPLICATE_KEY_GUARD.");
  return source;
}
