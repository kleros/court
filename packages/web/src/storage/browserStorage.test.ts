import { afterEach, describe, expect, it, vi } from "vitest";
import { browserLocalStorage, browserSessionStorage, subscribeStorageEvents } from "./browserStorage";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("browser storage accessors", () => {
  it("return the browser's localStorage and sessionStorage", () => {
    expect(browserLocalStorage()).toBe(window.localStorage);
    expect(browserSessionStorage()).toBe(window.sessionStorage);
  });

  it.each([
    ["localStorage", browserLocalStorage],
    ["sessionStorage", browserSessionStorage],
  ] as const)("return null instead of throwing when the browser blocks %s", (name, accessor) => {
    vi.spyOn(window, name, "get").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    expect(accessor()).toBeNull();
  });
});

describe("subscribeStorageEvents", () => {
  function listen() {
    const keys: (string | null)[] = [];
    const calls: unknown[][] = [];
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
    };
    window.addEventListener("error", onError);
    const unsubscribe = subscribeStorageEvents((...args) => {
      calls.push(args);
      keys.push(args[0]);
    });
    return {
      keys,
      calls,
      errors,
      stop: () => {
        unsubscribe();
        window.removeEventListener("error", onError);
      },
    };
  }

  it("passes on the changed key, also for a removal, a value that is not JSON and a cleared store", () => {
    const seen = listen();
    for (const init of [
      { key: "atlas_auth_token", oldValue: "t", newValue: null },
      { key: "@kleros/court/theme", newValue: "{not json" },
      { key: "a", newValue: "undefined" },
      { key: null, newValue: null },
    ]) {
      window.dispatchEvent(new StorageEvent("storage", init));
    }
    seen.stop();
    expect(seen.keys).toEqual(["atlas_auth_token", "@kleros/court/theme", "a", null]);
    expect(seen.errors).toEqual([]);
  });

  it("never hands the event's value to the handler: a page reads the key again through its safe storage", () => {
    const seen = listen();
    window.dispatchEvent(new StorageEvent("storage", { key: "a", newValue: '{"planted":true}' }));
    seen.stop();
    expect(seen.calls).toEqual([["a"]]);
  });

  it("ignores an event named storage that is not a storage event", () => {
    const seen = listen();
    window.dispatchEvent(new Event("storage"));
    seen.stop();
    expect(seen.calls).toEqual([]);
    expect(seen.errors).toEqual([]);
  });

  it("stops calling the handler after unsubscribe", () => {
    const seen = listen();
    seen.stop();
    window.dispatchEvent(new StorageEvent("storage", { key: "a" }));
    expect(seen.calls).toEqual([]);
  });
});
