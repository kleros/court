import type { KeyValueStorage } from "@court/core";

/** window.localStorage, or null: reading the property throws when the browser blocks site data. */
export function browserLocalStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** window.sessionStorage, or null when the browser blocks it. */
export function browserSessionStorage(): KeyValueStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Calls `handler` with the key another page of this origin changed (null when it cleared the store), removals
 * included: a sign-out in another tab arrives as a removal. The event's values are never parsed or passed on; a page
 * reads the key again through its SafeStorage, which parses defensively, drops a bad value and never returns the old
 * app's keys. Returns the unsubscribe function.
 */
export function subscribeStorageEvents(handler: (key: string | null) => void): () => void {
  const listener = (event: Event): void => {
    if (event instanceof StorageEvent) handler(event.key);
  };
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("storage", listener);
  };
}
