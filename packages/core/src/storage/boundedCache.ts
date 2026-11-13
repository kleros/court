import { invalid, isPlainObject } from "../kernel/index.ts";
import { STORAGE_KEYS } from "./keys.ts";
import { STORAGE_INVALID } from "./types.ts";
import type { BoundedCache, BoundedCacheOptions, SafeStorage } from "./types.ts";

const TOO_LARGE = STORAGE_INVALID[0];

/**
 * Each entry is stored as JSON {"t": time of last use in ms, "v": value}. Keeping the time inside the entry means the
 * bounds are always computed from what is really stored (other pages of the origin write here too) and the cache
 * needs no index key of its own.
 */
interface Entry {
  readonly t: number;
  readonly v: unknown;
}

function parseEntry(text: string): Entry | null {
  try {
    const entry: unknown = JSON.parse(text);
    return isPlainObject(entry) && typeof entry.t === "number" ? { t: entry.t, v: entry.v } : null;
  } catch {
    return null;
  }
}

/**
 * The entry's text, or null when this engine cannot serialize the value. JSON.stringify recurses once per nesting
 * level, so valid JSON from a fetched file, nested thousands of levels deep, overflows the stack (RangeError, or
 * InternalError in Firefox) although JSON.parse accepted it: that is the data's size, not the caller's mistake. A
 * bigint or a cycle (TypeError) still throws: the caller passed something JSON cannot hold.
 */
function stored(value: unknown): string | null {
  try {
    return JSON.stringify({ t: Date.now(), v: value });
  } catch (error) {
    if (error instanceof TypeError) throw error;
    return null;
  }
}

/** Browsers hold keys and values as UTF-16 strings: 2 bytes per code unit. */
function bytesOf(key: string, text: string): number {
  return (key.length + text.length) * 2;
}

/**
 * A least-recently-used cache in browser storage, one namespace of the storage registry, bounded by entry count and
 * by bytes. It holds only what callers validated, and `get` re-checks every entry with the caller's parser, so a
 * stored value is never trusted on read.
 */
export function createBoundedCache(
  storage: SafeStorage,
  { namespace, maxEntries, maxBytes }: BoundedCacheOptions,
): BoundedCache {
  if (!Number.isInteger(maxEntries) || maxEntries < 1 || !Number.isInteger(maxBytes) || maxBytes < 1) {
    throw new Error("A bounded cache needs at least one entry and one byte.");
  }
  const prefix = STORAGE_KEYS.cacheEntry(namespace, "");

  /** The other entries of this namespace, least recently used first. Text that is not an entry is removed. */
  function otherEntries(except: string): { key: string; t: number; bytes: number }[] {
    const entries: { key: string; t: number; bytes: number }[] = [];
    for (const key of storage.keys(prefix)) {
      if (key === except) continue;
      const text = storage.read(key);
      if (text === null) continue;
      const entry = parseEntry(text);
      if (entry === null) storage.remove(key);
      else entries.push({ key, t: entry.t, bytes: bytesOf(key, text) });
    }
    return entries.sort((a, b) => a.t - b.t || (a.key < b.key ? -1 : 1));
  }

  return {
    get(key, parse) {
      const fullKey = prefix + key;
      const text = storage.read(fullKey);
      if (text === null) return null;
      const entry = parseEntry(text);
      if (entry !== null) {
        const parsed = parse(entry.v);
        if (parsed.ok) {
          // Records the use for eviction order only: the value is returned even when this write fails or the value
          // cannot be serialized again here (the entry then keeps its old time and is evicted sooner).
          const renewed = stored(entry.v);
          if (renewed !== null) storage.write(fullKey, renewed);
          return parsed.value;
        }
      }
      storage.remove(fullKey);
      return null;
    },

    set(key, value) {
      const fullKey = prefix + key;
      const text = stored(value);
      if (text === null) return invalid(TOO_LARGE, "The value is nested deeper than this browser can store.");
      const bytes = bytesOf(fullKey, text);
      if (bytes > maxBytes) return invalid(TOO_LARGE, "The value is larger than this cache holds.");
      const others = otherEntries(fullKey);
      let count = others.length + 1;
      let total = others.reduce((sum, entry) => sum + entry.bytes, bytes);
      for (const oldest of others) {
        if (count <= maxEntries && total <= maxBytes) break;
        storage.remove(oldest.key);
        count -= 1;
        total -= oldest.bytes;
      }
      return storage.write(fullKey, text);
    },

    delete(key) {
      storage.remove(prefix + key);
    },
  };
}
