import { KERNEL_INVALID } from "../kernel/index.ts";
import type { Outcome } from "../kernel/index.ts";

/**
 * Why a storage write did not happen: the value is larger than its cache holds or nested deeper than the browser can
 * serialize ("too-large", the kernel's reason), the browser store is full ("quota"), or the store is blocked or
 * missing ("no-storage": site data blocked, no window).
 * The kernel's refused reasons name the user, the wallet and transaction guards, none of which applies here, so these
 * are reported as invalid with this module's reasons.
 */
export const STORAGE_INVALID = [KERNEL_INVALID[0], "quota", "no-storage"] as const;
export type StorageInvalidReason = (typeof STORAGE_INVALID)[number];

/**
 * Browser storage whose failures come back as values: a blocked or full store never throws at the caller. The old
 * app's keys (NEVER_READ_PREFIXES) are invisible to every reader; write and remove throw on one (a programmer error:
 * the app never builds those keys).
 */
export interface SafeStorage {
  /** The stored string; null when absent, when the store is blocked, or for an old-app key. */
  read(key: string): string | null;
  /** For keys that hold JSON. A value that is not JSON or that `parse` refuses is removed and reads as null. */
  readJson<T>(key: string, parse: (value: unknown) => Outcome<T>): T | null;
  /** Fails with invalid "quota" (store full) or "no-storage" (store blocked or missing); never silently. */
  write(key: string, value: string): Outcome<void>;
  /** Best effort: a blocked store has nothing this page can remove. */
  remove(key: string): void;
  /** Every stored key starting with `prefix`, old-app keys left out; none when the store is blocked. */
  keys(prefix: string): readonly string[];
}

/** The caches of the app (storage registry): one bounded namespace each. */
export type CacheNamespace = "case-file" | "reality-locator" | "applied-ruling" | "claim-entry";

export interface BoundedCacheOptions {
  readonly namespace: CacheNamespace;
  readonly maxEntries: number;
  /** Counted as browsers hold strings: 2 bytes per UTF-16 code unit of each entry's key and stored text. */
  readonly maxBytes: number;
}

/** A least-recently-used cache in browser storage, bounded by entry count and bytes per namespace. */
export interface BoundedCache {
  /**
   * The value when `parse` accepts it again; an entry it refuses (or that is not an entry) is removed. A hit records
   * its use, except for a value nested too deep to serialize again (it is still returned).
   */
  get<T>(key: string, parse: (value: unknown) => Outcome<T>): T | null;
  /**
   * Stores a value the caller has already validated. It must be JSON-safe: a bigint or a cycle throws (programmer
   * error). A value over maxBytes, or nested deeper than this browser's JSON.stringify can follow (valid JSON from a
   * fetched file can be), is refused (invalid "too-large"): nothing is written or evicted for it.
   */
  set(key: string, value: unknown): Outcome<void>;
  delete(key: string): void;
}
