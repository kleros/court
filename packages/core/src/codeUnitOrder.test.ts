import { describe, expect, it } from "vitest";
import { compareCodeUnits } from "./codeUnitOrder.ts";

describe("compareCodeUnits", () => {
  it("orders by UTF-16 code unit: not by locale, not by code point", () => {
    const values = ["b", "\u{1F600}", "a", "\uFF5E", "\u00E9", "f", "B", "e", "10", "9", "", "a"];
    // "B" before "a" and "\u00E9" after "f" (a locale order puts "B" after "a" and "\u00E9" between "e" and "f");
    // "\u{1F600}" (first code unit 0xD83D) before "\uFF5E" (a code point order puts it after).
    expect([...values].sort(compareCodeUnits)).toEqual([
      "",
      "10",
      "9",
      "B",
      "a",
      "a",
      "b",
      "e",
      "f",
      "\u00E9",
      "\u{1F600}",
      "\uFF5E",
    ]);
  });

  it("answers 0 only for equal strings", () => {
    expect(compareCodeUnits("a", "a")).toBe(0);
    expect(compareCodeUnits("a", "b")).toBe(-1);
    expect(compareCodeUnits("b", "a")).toBe(1);
  });
});
