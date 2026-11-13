import { describe, expect, it } from "vitest";
import { invalid, succeed } from "../kernel/index.ts";
import type { Outcome } from "../kernel/index.ts";
import { fakeStorage, quotaError, securityError } from "./fakeStorage.ts";
import type { StorageMember } from "./fakeStorage.ts";
import { NEVER_READ_PREFIXES, STORAGE_KEYS } from "./keys.ts";
import { createSafeStorage, findKeyCaseInsensitive } from "./safeStorage.ts";

const ACCOUNT = "0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed";

function parseString(value: unknown): Outcome<string> {
  return typeof value === "string" ? succeed(value) : invalid("not-a-string", "not a string");
}

const NO_STORAGE = { ok: false, failure: { kind: "invalid", reason: "no-storage" } };

describe("createSafeStorage with a store the browser withholds", () => {
  const withholding: [string, () => null][] = [
    [
      "the accessor throws (site data blocked)",
      () => {
        throw securityError();
      },
    ],
    ["there is no store", () => null],
  ];

  it.each(withholding)("reads nothing, refuses writes and never throws when %s", (_, getStorage) => {
    const storage = createSafeStorage(getStorage);
    expect(storage.read("a")).toBeNull();
    expect(storage.readJson("a", parseString)).toBeNull();
    expect(storage.keys("")).toEqual([]);
    expect(storage.write("a", "1")).toMatchObject(NO_STORAGE);
    expect(() => {
      storage.remove("a");
    }).not.toThrow();
    expect(findKeyCaseInsensitive(storage, "a")).toBeNull();
  });

  const members: StorageMember[] = ["getItem", "setItem", "removeItem", "key", "length"];
  it.each(members)("survives %s throwing a SecurityError", (member) => {
    const store = fakeStorage({ a: '"x"', b: '"y"' });
    store.failing.set(member, securityError());
    const storage = createSafeStorage(() => store);
    const readable = member !== "getItem";
    expect(storage.read("a")).toBe(readable ? '"x"' : null);
    expect(storage.readJson("a", parseString)).toBe(readable ? "x" : null);
    expect(storage.keys("")).toEqual(member === "key" || member === "length" ? [] : ["a", "b"]);
    expect(storage.write("c", "1")).toMatchObject(member === "setItem" ? NO_STORAGE : succeed(undefined));
    expect(() => {
      storage.remove("a");
    }).not.toThrow();
  });
});

describe("createSafeStorage writes", () => {
  it("writes a value and reads it back", () => {
    const store = fakeStorage();
    const storage = createSafeStorage(() => store);
    expect(storage.write("a", "1")).toEqual(succeed(undefined));
    expect(storage.read("a")).toBe("1");
  });

  it("reports a full store instead of dropping the write silently", () => {
    const store = fakeStorage({ a: "old" });
    store.failing.set("setItem", quotaError());
    const result = createSafeStorage(() => store).write("a", "new");
    expect(result).toMatchObject({ ok: false, failure: { kind: "invalid", reason: "quota" } });
    expect(result.ok ? "" : result.failure.message).toMatch(/full/);
    expect(store.data.get("a")).toBe("old");
  });

  it("removes a key", () => {
    const store = fakeStorage({ a: "1", b: "2" });
    createSafeStorage(() => store).remove("a");
    expect([...store.data.keys()]).toEqual(["b"]);
  });
});

describe("createSafeStorage readJson", () => {
  it("returns the parsed value", () => {
    const store = fakeStorage({ a: '"x"' });
    expect(createSafeStorage(() => store).readJson("a", parseString)).toBe("x");
    expect(store.data.has("a")).toBe(true);
  });

  it("removes a value that is not JSON and reads it as null", () => {
    const store = fakeStorage({ a: "{not json", b: "" });
    const storage = createSafeStorage(() => store);
    expect(storage.readJson("a", parseString)).toBeNull();
    expect(storage.readJson("b", parseString)).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it("removes a value its parser refuses and reads it as null", () => {
    const store = fakeStorage({ a: "0" });
    expect(createSafeStorage(() => store).readJson("a", parseString)).toBeNull();
    expect(store.data.has("a")).toBe(false);
  });

  it("removes nothing for a missing key", () => {
    const store = fakeStorage({ b: "{bad" });
    expect(createSafeStorage(() => store).readJson("a", parseString)).toBeNull();
    expect(store.calls).not.toContain("removeItem");
  });
});

describe("createSafeStorage keys", () => {
  it("lists only the keys with the prefix", () => {
    const store = fakeStorage({ "p/1": "", "p/2": "", q: "" });
    expect(createSafeStorage(() => store).keys("p/")).toEqual(["p/1", "p/2"]);
  });
});

describe("the old app's keys", () => {
  const oldKeys = NEVER_READ_PREFIXES.map((prefix) => `${prefix}${prefix.endsWith("/") ? "1/0xabc/7" : ""}`);
  const live = {
    [STORAGE_KEYS.fallbackChainId]: "100",
    [STORAGE_KEYS.watchAssetAsked("PNK", 100, "0xabc")]: "true",
  };

  it("are never returned by read, readJson, keys or findKeyCaseInsensitive, and never removed by a bad read", () => {
    const store = fakeStorage({ ...Object.fromEntries(oldKeys.map((key) => [key, "{not json"])), ...live });
    const storage = createSafeStorage(() => store);
    for (const key of oldKeys) {
      expect(storage.read(key)).toBeNull();
      expect(storage.readJson(key, parseString)).toBeNull();
    }
    expect(store.calls).not.toContain("getItem");
    for (const key of oldKeys) {
      expect(findKeyCaseInsensitive(storage, key.toUpperCase())).toBeNull();
    }
    expect(storage.keys("")).toEqual(Object.keys(live));
    expect(storage.keys("@@kleros/court/")).toEqual(Object.keys(live));
    expect(store.data.size).toBe(oldKeys.length + 2);
  });

  it("are refused to write and remove (a programmer error) and stay as the old app left them", () => {
    const store = fakeStorage(Object.fromEntries(oldKeys.map((key) => [key, "old"])));
    const storage = createSafeStorage(() => store);
    for (const key of oldKeys) {
      expect(() => storage.write(key, "new")).toThrow();
      expect(() => {
        storage.remove(key);
      }).toThrow();
      expect(store.data.get(key)).toBe("old");
    }
  });
});

describe("findKeyCaseInsensitive", () => {
  const stored = (key: string) => createSafeStorage(() => fakeStorage({ [key]: "0xsig", other: "" }));

  it("finds the salt, justification-key and committed-vote keys the old app stored in EIP-55 form, looked up in lowercase", () => {
    for (const key of [
      STORAGE_KEYS.salt(ACCOUNT),
      STORAGE_KEYS.derivedKey(ACCOUNT),
      STORAGE_KEYS.committedVote(ACCOUNT, 12n),
    ]) {
      expect(key).not.toBe(key.toLowerCase());
      expect(findKeyCaseInsensitive(stored(key), key.toLowerCase())).toBe(key);
    }
  });

  it("finds a key stored in lowercase when looked up in EIP-55 form", () => {
    const key = STORAGE_KEYS.salt(ACCOUNT);
    expect(findKeyCaseInsensitive(stored(key.toLowerCase()), key)).toBe(key.toLowerCase());
  });

  it("prefers the exact key, then the first other spelling in sort order", () => {
    const key = STORAGE_KEYS.salt(ACCOUNT);
    const lower = key.toLowerCase();
    const upper = key.toUpperCase();
    const both = createSafeStorage(() => fakeStorage({ [lower]: "1", [key]: "2", [upper]: "3" }));
    expect(findKeyCaseInsensitive(both, key)).toBe(key);
    const others = createSafeStorage(() => fakeStorage({ [lower]: "1", [upper]: "3" }));
    expect(findKeyCaseInsensitive(others, key)).toBe(upper);
    const reversed = createSafeStorage(() => fakeStorage({ [upper]: "3", [lower]: "1" }));
    expect(findKeyCaseInsensitive(reversed, key)).toBe(upper);
  });

  it("returns null when no spelling of the key is stored", () => {
    expect(findKeyCaseInsensitive(stored("x"), STORAGE_KEYS.salt(ACCOUNT))).toBeNull();
  });
});
