import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invalid, succeed } from "../kernel/index.ts";
import type { Outcome } from "../kernel/index.ts";
import { createBoundedCache } from "./boundedCache.ts";
import { fakeStorage, quotaError, securityError } from "./fakeStorage.ts";
import { createSafeStorage } from "./safeStorage.ts";
import type { BoundedCacheOptions } from "./types.ts";

const PREFIX = "@kleros/court/cache/v1/case-file/";
const T0 = 1_700_000_000_000;

function parseString(value: unknown): Outcome<string> {
  return typeof value === "string" ? succeed(value) : invalid("not-a-string", "not a string");
}

function setup(limits: Partial<BoundedCacheOptions> = {}, entries: Record<string, string> = {}) {
  const store = fakeStorage(entries);
  const options = { namespace: "case-file", maxEntries: 500, maxBytes: 2 * 1024 * 1024, ...limits } as const;
  return {
    store,
    cache: createBoundedCache(
      createSafeStorage(() => store),
      options,
    ),
  };
}

/** Bytes one entry takes: 2 per UTF-16 code unit of its full key and stored text. */
function entryBytes(key: string, value: string): number {
  const { store, cache } = setup();
  cache.set(key, value);
  const stored = store.data.get(PREFIX + key) ?? "";
  return (PREFIX.length + key.length + stored.length) * 2;
}

const later = () => {
  vi.setSystemTime(Date.now() + 1000);
};
const cachedKeys = (data: Map<string, string>) => [...data.keys()].filter((key) => key.startsWith(PREFIX)).sort();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("createBoundedCache get and set", () => {
  it("stores a value under the cache prefix with its time of use and returns it through its parser", () => {
    const { store, cache } = setup();
    expect(cache.set("1/1684", "case")).toEqual(succeed(undefined));
    expect(store.data.get(`${PREFIX}1/1684`)).toBe(`{"t":${T0},"v":"case"}`);
    expect(cache.get("1/1684", parseString)).toBe("case");
  });

  it("reads a missing key as null", () => {
    expect(setup().cache.get("a", parseString)).toBeNull();
  });

  it("removes an entry its parser refuses, so a malformed value is never served", () => {
    const { store, cache } = setup({}, { [`${PREFIX}a`]: '{"t":1,"v":0}' });
    expect(cache.get("a", parseString)).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it("removes stored text that is not a cache entry", () => {
    const garbage = { a: "{bad", b: '"x"', c: '{"v":"x"}', d: '{"t":"1","v":"x"}', e: "[1]" };
    const { store, cache } = setup({}, Object.fromEntries(Object.entries(garbage).map(([k, v]) => [PREFIX + k, v])));
    for (const key of Object.keys(garbage)) expect(cache.get(key, parseString)).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it("returns the value even when recording its use fails", () => {
    const { store, cache } = setup();
    cache.set("a", "x");
    store.failing.set("setItem", quotaError());
    later();
    expect(cache.get("a", parseString)).toBe("x");
    expect(store.data.get(`${PREFIX}a`)).toBe(`{"t":${T0},"v":"x"}`);
  });

  it("deletes an entry", () => {
    const { store, cache } = setup();
    cache.set("a", "x");
    cache.delete("a");
    expect(store.data.size).toBe(0);
  });

  it("throws on a value JSON cannot hold (a programmer error)", () => {
    expect(() => setup().cache.set("a", { applied: 1n })).toThrow(TypeError);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => setup().cache.set("a", cycle)).toThrow(TypeError);
  });

  // Valid JSON from a fetched file (40 kB here) can nest deeper than JSON.stringify follows: the parser accepts it,
  // serializing it again overflows the stack. Not checked with toEqual, which recurses too.
  const DEEP_TEXT = "[".repeat(20_000) + "]".repeat(20_000);

  it("refuses a value nested deeper than this engine can serialize, writing and evicting nothing", () => {
    const deep: unknown = JSON.parse(DEEP_TEXT);
    expect(() => JSON.stringify(deep)).toThrow(RangeError);
    const { store, cache } = setup({ maxEntries: 1 });
    cache.set("a", "x");
    expect(cache.set("deep", { uri: "u", caseFileLoad: deep })).toMatchObject({
      ok: false,
      failure: { kind: "invalid", reason: "too-large" },
    });
    expect(cachedKeys(store.data)).toEqual([`${PREFIX}a`]);
  });

  it("returns a stored value too deep to serialize again, leaving its entry as it was", () => {
    const text = `{"t":1,"v":${DEEP_TEXT}}`;
    const { store, cache } = setup({}, { [`${PREFIX}deep`]: text });
    const isArray = (value: unknown): Outcome<string> =>
      Array.isArray(value) ? succeed("served") : invalid("not-an-array", "not an array");
    expect(cache.get("deep", isArray)).toBe("served");
    expect(store.data.get(`${PREFIX}deep`)).toBe(text);
  });

  it("refuses limits below one entry or one byte", () => {
    expect(() => setup({ maxEntries: 0 })).toThrow();
    expect(() => setup({ maxBytes: 0 })).toThrow();
    expect(() => setup({ maxEntries: 1.5 })).toThrow();
  });
});

describe("createBoundedCache bounds", () => {
  it("evicts the least recently used entry when the entry count is reached; a read counts as a use", () => {
    const { store, cache } = setup({ maxEntries: 3 });
    for (const key of ["a", "b", "c"]) {
      cache.set(key, key);
      later();
    }
    expect(cache.get("a", parseString)).toBe("a");
    later();
    cache.set("d", "d");
    expect(cachedKeys(store.data)).toEqual([`${PREFIX}a`, `${PREFIX}c`, `${PREFIX}d`]);
  });

  it("evicts least recently used entries until the bytes fit", () => {
    const value = "x".repeat(100);
    const one = entryBytes("a", value);
    const { store, cache } = setup({ maxBytes: Math.floor(2.5 * one) });
    for (const key of ["a", "b", "c"]) {
      expect(cache.set(key, value)).toEqual(succeed(undefined));
      later();
    }
    expect(cachedKeys(store.data)).toEqual([`${PREFIX}b`, `${PREFIX}c`]);
    cache.set("d", "x".repeat(250));
    expect(cachedKeys(store.data)).toEqual([`${PREFIX}d`]);
  });

  it("counts 2 bytes per UTF-16 code unit of the key and the stored text", () => {
    const value = "é😀".repeat(10);
    const exact = entryBytes("a", value);
    expect(setup({ maxBytes: exact }).cache.set("a", value)).toEqual(succeed(undefined));
    expect(setup({ maxBytes: exact - 1 }).cache.set("a", value)).toMatchObject({
      ok: false,
      failure: { kind: "invalid", reason: "too-large" },
    });
  });

  it("refuses a value over the byte cap and evicts nothing for it", () => {
    const one = entryBytes("a", "x");
    const { store, cache } = setup({ maxBytes: 4 * one });
    cache.set("a", "x");
    cache.set("b", "x");
    const result = cache.set("big", "x".repeat(4 * one));
    expect(result).toMatchObject({ ok: false, failure: { kind: "invalid", reason: "too-large" } });
    expect(cachedKeys(store.data)).toEqual([`${PREFIX}a`, `${PREFIX}b`]);
  });

  it("does not count a key's old value when the key is replaced", () => {
    const { store, cache } = setup({ maxEntries: 2 });
    cache.set("a", "1");
    later();
    cache.set("b", "1");
    later();
    cache.set("b", "2");
    expect(cachedKeys(store.data)).toEqual([`${PREFIX}a`, `${PREFIX}b`]);
    expect(cache.get("b", parseString)).toBe("2");
  });

  it("evicts only from its own namespace and leaves every other key alone", () => {
    const outside = {
      "@kleros/court/cache/v1/reality-locator/a": `{"t":1,"v":"x"}`,
      "@kleros/court/cache/v1/case-file-other/a": `{"t":1,"v":"x"}`,
      "@kleros/court/theme": '"dark"',
    };
    const { store, cache } = setup({ maxEntries: 1 }, outside);
    cache.set("a", "x");
    later();
    cache.set("b", "x");
    expect(cachedKeys(store.data)).toEqual([`${PREFIX}b`]);
    for (const [key, value] of Object.entries(outside)) expect(store.data.get(key)).toBe(value);
  });

  it("removes stored text that is not a cache entry while making room", () => {
    const { store, cache } = setup({ maxEntries: 5 }, { [`${PREFIX}junk`]: "{bad" });
    cache.set("a", "x");
    expect(cachedKeys(store.data)).toEqual([`${PREFIX}a`]);
  });
});

describe("createBoundedCache storage failures", () => {
  it("reports a full store on set instead of dropping the value silently", () => {
    const { store, cache } = setup();
    store.failing.set("setItem", quotaError());
    expect(cache.set("a", "x")).toMatchObject({ ok: false, failure: { kind: "invalid", reason: "quota" } });
  });

  it("reads nothing, refuses set and never throws when the store is blocked", () => {
    const cache = createBoundedCache(
      createSafeStorage(() => {
        throw securityError();
      }),
      { namespace: "claim-entry", maxEntries: 500, maxBytes: 2 * 1024 * 1024 },
    );
    expect(cache.get("a", parseString)).toBeNull();
    expect(cache.set("a", "x")).toMatchObject({ ok: false, failure: { kind: "invalid", reason: "no-storage" } });
    expect(() => {
      cache.delete("a");
    }).not.toThrow();
  });
});
