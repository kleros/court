import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDisputeId, parseRouteChainId } from "./index.ts";

describe("parseRouteChainId", () => {
  it("accepts each court chain written as its plain decimal id, test networks included", () => {
    expect(parseRouteChainId("1")).toBe(1);
    expect(parseRouteChainId("100")).toBe(100);
    expect(parseRouteChainId("10200")).toBe(10200);
    expect(parseRouteChainId("11155111")).toBe(11155111);
  });

  it("refuses every other form and every other chain", () => {
    for (const segment of [
      "0100",
      "1e2",
      " 100",
      "100 ",
      "+100",
      "0x64",
      "100.0",
      "1_00",
      "１００",
      "",
      "137",
      "0",
      "-1",
    ]) {
      expect(parseRouteChainId(segment), JSON.stringify(segment)).toBeNull();
    }
  });

  it("refuses a missing or non-string segment", () => {
    expect(parseRouteChainId(undefined)).toBeNull();
    expect(parseRouteChainId(100)).toBeNull();
  });
});

describe("parseDisputeId", () => {
  const MAX_UINT256 = 2n ** 256n - 1n;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts canonical decimal ids, from 0 up to the largest uint256", () => {
    expect(parseDisputeId("0")).toBe(0n);
    expect(parseDisputeId("1")).toBe(1n);
    expect(parseDisputeId("1684")).toBe(1684n);
    expect(parseDisputeId(MAX_UINT256.toString())).toBe(MAX_UINT256);
  });

  it("refuses every other form: case page addresses name one dispute only", () => {
    for (const segment of [
      "0X1",
      "0x1",
      "01",
      "00",
      "1.0",
      "1e3",
      " 1",
      "1 ",
      "+1",
      "-1",
      "1n",
      "1_000",
      "１",
      "٣",
      "",
      (MAX_UINT256 + 1n).toString(),
    ]) {
      expect(parseDisputeId(segment), JSON.stringify(segment)).toBeNull();
    }
  });

  it("refuses a missing or non-string segment", () => {
    expect(parseDisputeId(undefined)).toBeNull();
    expect(parseDisputeId(1)).toBeNull();
    expect(parseDisputeId(1n)).toBeNull();
  });

  it("refuses a segment longer than any uint256 before building a number from it", () => {
    const bigIntCalls = vi.fn(BigInt);
    vi.stubGlobal("BigInt", bigIntCalls);
    expect(parseDisputeId("9".repeat(79))).toBeNull();
    expect(parseDisputeId("1".repeat(1_000_000))).toBeNull();
    expect(bigIntCalls).not.toHaveBeenCalled();
  });
});
