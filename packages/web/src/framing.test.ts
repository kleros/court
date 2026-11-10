import { describe, expect, it } from "vitest";
import { isFramed } from "./framing";

describe("isFramed", () => {
  it("is false for a top-level window", () => {
    expect(isFramed(window)).toBe(false);
    const w = {};
    expect(isFramed({ self: w, top: w })).toBe(false);
  });

  it("is true inside a frame, and when the top window is gone", () => {
    expect(isFramed({ self: {}, top: {} })).toBe(true);
    expect(isFramed({ self: {}, top: null })).toBe(true);
  });
});
