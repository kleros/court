import { KERNEL_INVALID, invalid, succeed } from "../kernel/index.ts";
import type { KeyValueStorage, Outcome } from "../kernel/index.ts";
import { isNeverRead } from "./keys.ts";
import { STORAGE_INVALID } from "./types.ts";
import type { SafeStorage } from "./types.ts";

const NOT_JSON = KERNEL_INVALID[1];
const QUOTA = STORAGE_INVALID[1];
const NO_STORAGE = STORAGE_INVALID[2];

function isQuotaError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "QuotaExceededError";
}

function parseJson(text: string): Outcome<unknown> {
  try {
    const value: unknown = JSON.parse(text);
    return succeed(value);
  } catch {
    return invalid(NOT_JSON, "The stored value is not JSON.");
  }
}

/**
 * Browser storage behind one guard. The browser may withhold it (reading `localStorage` or any member throws when
 * site data is blocked) or fill it (every write throws QuotaExceededError). Reads then give null and writes a failure
 * the caller can show, so storage trouble never stops boot or Connect and never drops a write without a word.
 * `getStorage` is called on every use, so the answer follows the browser's current state.
 */
export function createSafeStorage(getStorage: () => KeyValueStorage | null): SafeStorage {
  function store(): KeyValueStorage | null {
    try {
      return getStorage();
    } catch {
      return null;
    }
  }

  // The app never builds these keys; touching one would change what the old app reads on the same origin.
  function refuseOldKey(key: string): void {
    if (isNeverRead(key)) throw new Error("The old app's storage keys are never written or removed by this app.");
  }

  const storage: SafeStorage = {
    read(key) {
      if (isNeverRead(key)) return null;
      try {
        return store()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },

    readJson(key, parse) {
      const text = storage.read(key);
      if (text === null) return null;
      const result = parseJson(text);
      const parsed = result.ok ? parse(result.value) : result;
      if (parsed.ok) return parsed.value;
      // A bad stored value is dropped, so it cannot fail every later read too.
      storage.remove(key);
      return null;
    },

    write(key, value) {
      refuseOldKey(key);
      const target = store();
      if (target === null) return invalid(NO_STORAGE, "Browser storage is blocked or unavailable.");
      try {
        target.setItem(key, value);
        return succeed(undefined);
      } catch (error) {
        return isQuotaError(error)
          ? invalid(QUOTA, "Browser storage is full.")
          : invalid(NO_STORAGE, "Browser storage refused the write.");
      }
    },

    remove(key) {
      refuseOldKey(key);
      try {
        store()?.removeItem(key);
      } catch {
        // Blocked storage holds nothing this page can remove.
      }
    },

    keys(prefix) {
      const source = store();
      if (source === null) return [];
      try {
        const found: string[] = [];
        for (let index = 0; index < source.length; index += 1) {
          const key = source.key(index);
          if (key !== null && key.startsWith(prefix) && !isNeverRead(key)) found.push(key);
        }
        return found;
      } catch {
        return [];
      }
    },
  };
  return storage;
}

/**
 * The stored key equal to `key` ignoring case, or null. For the keys whose account part another app or an older
 * build may have written in a different case: the salt, the committed vote and the justification key. The exact key
 * wins; among other spellings the first in sort order, so the answer does not depend on the browser's key order.
 */
export function findKeyCaseInsensitive(storage: SafeStorage, key: string): string | null {
  if (storage.read(key) !== null) return key;
  const wanted = key.toLowerCase();
  const spellings = storage.keys("").filter((stored) => stored.toLowerCase() === wanted);
  return spellings.sort()[0] ?? null;
}
