import type { KeyValueStorage } from "../kernel/index.ts";

export type StorageMember = "getItem" | "setItem" | "removeItem" | "key" | "length";

/** Test support: an in-memory store whose members throw a chosen error, as a blocked or full browser store does. */
export interface FakeStorage extends KeyValueStorage {
  readonly data: Map<string, string>;
  /** Members that throw from now on, and the error each throws. */
  readonly failing: Map<StorageMember, Error>;
  /** Member names in call order. */
  readonly calls: StorageMember[];
}

export function fakeStorage(entries: Record<string, string> = {}): FakeStorage {
  const data = new Map(Object.entries(entries));
  const failing = new Map<StorageMember, Error>();
  const calls: StorageMember[] = [];
  function enter(member: StorageMember): void {
    calls.push(member);
    const error = failing.get(member);
    if (error !== undefined) throw error;
  }
  return {
    data,
    failing,
    calls,
    getItem(key) {
      enter("getItem");
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      enter("setItem");
      data.set(key, value);
    },
    removeItem(key) {
      enter("removeItem");
      data.delete(key);
    },
    key(index) {
      enter("key");
      return [...data.keys()][index] ?? null;
    },
    get length() {
      enter("length");
      return data.size;
    },
  };
}

export const securityError = (): DOMException => new DOMException("The operation is insecure.", "SecurityError");
export const quotaError = (): DOMException => new DOMException("The quota has been exceeded.", "QuotaExceededError");
