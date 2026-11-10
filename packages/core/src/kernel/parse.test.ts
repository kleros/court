import { describe, expect, it } from "vitest";
import { isPlainObject, readOptionalString, readString } from "./parse.ts";

describe("isPlainObject", () => {
  it("accepts objects as JSON and structured clone give them", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ title: "x" })).toBe(true);
    expect(isPlainObject(JSON.parse('{"a":1}'))).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
    expect(isPlainObject(structuredClone({ a: [1] }))).toBe(true);
  });

  it("refuses arrays, null, primitives and objects of another kind", () => {
    class Point {
      x = 1;
    }
    for (const value of [[], null, undefined, "x", 0, false, 1n, new Date(0), new Map(), new Point(), () => 1]) {
      expect(isPlainObject(value)).toBe(false);
    }
  });
});

describe("readString", () => {
  const record: Record<string, unknown> = { title: "Case", empty: "", count: 2, nothing: null, nested: { a: "x" } };

  it("returns the value only when it is a string", () => {
    expect(readString(record, "title")).toBe("Case");
    expect(readString(record, "empty")).toBe("");
    expect(readString(record, "count")).toBeUndefined();
    expect(readString(record, "nothing")).toBeUndefined();
    expect(readString(record, "nested")).toBeUndefined();
    expect(readString(record, "missing")).toBeUndefined();
  });

  it("reads only the record's own fields", () => {
    const inherited = Object.create({ title: "from the prototype" }) as Record<string, unknown>;
    expect(readString(inherited, "title")).toBeUndefined();
    expect(readString({}, "toString")).toBeUndefined();
  });
});

describe("readOptionalString", () => {
  it("tells a missing field from one of the wrong type", () => {
    const record: Record<string, unknown> = { title: "Case", empty: "", unset: undefined, count: 2, nothing: null };
    expect(readOptionalString(record, "title")).toEqual({ ok: true, value: "Case" });
    expect(readOptionalString(record, "empty")).toEqual({ ok: true, value: "" });
    expect(readOptionalString(record, "missing")).toEqual({ ok: true, value: undefined });
    expect(readOptionalString(record, "unset")).toEqual({ ok: true, value: undefined });
    for (const key of ["count", "nothing"]) {
      const outcome = readOptionalString(record, key);
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.failure).toMatchObject({ kind: "invalid", reason: "not-a-string" });
    }
  });

  it("treats an inherited field as missing", () => {
    const inherited = Object.create({ title: 7 }) as Record<string, unknown>;
    expect(readOptionalString(inherited, "title")).toEqual({ ok: true, value: undefined });
  });
});
