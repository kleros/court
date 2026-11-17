// @vitest-environment node
import { describe, expect, it } from "vitest";
import { availableToStake, meetsMinStake, stakePathCapReached, withinAvailable } from "./staking.ts";

const E18 = 10n ** 18n;

describe("availableToStake", () => {
  it("is balance minus total staked, negative when the balance fell below the stake (COURTS-Q4)", () => {
    expect(availableToStake(5000n * E18, 3000n * E18)).toBe(2000n * E18);
    expect(availableToStake(1000n * E18, 3000n * E18)).toBe(-2000n * E18);
  });
});

describe("meetsMinStake (master rule 1)", () => {
  const minStake = 500n * E18;
  it("passes at or above the court minimum", () => {
    expect(meetsMinStake(500n * E18, minStake)).toBe(true);
    expect(meetsMinStake(501n * E18, minStake)).toBe(true);
  });
  it("refuses below the minimum, 0 included (COURTS-Q3)", () => {
    expect(meetsMinStake(500n * E18 - 1n, minStake)).toBe(false);
    expect(meetsMinStake(0n, minStake)).toBe(false);
  });
  it("matches master's change form: change >= minStake - current", () => {
    const current = 1000n * E18;
    for (const change of [-1000n * E18, -500n * E18, -500n * E18 - 1n, 0n, 7n * E18]) {
      expect(meetsMinStake(current + change, minStake)).toBe(change >= minStake - current);
    }
  });
});

describe("withinAvailable (master rule 2)", () => {
  it("caps the change at what is available", () => {
    expect(withinAvailable(100n, 100n)).toBe(true);
    expect(withinAvailable(101n, 100n)).toBe(false);
    expect(withinAvailable(-5000n, 100n)).toBe(true);
  });
  it("flips with a negative available, so any increase passes (COURTS-Q4)", () => {
    expect(withinAvailable(10_000n, -100n)).toBe(true);
    expect(withinAvailable(-100n, -100n)).toBe(true);
    expect(withinAvailable(-101n, -100n)).toBe(false);
  });
});

describe("stakePathCapReached (D-26)", () => {
  const four = [0n, 2n, 5n, 9n];
  it("blocks a fifth court", () => {
    expect(stakePathCapReached(four, 4n, 7n, 1n)).toBe(true);
  });
  it("allows changing a court the juror is already in", () => {
    expect(stakePathCapReached(four, 4n, 5n, 1n)).toBe(false);
  });
  it("allows a new court with three in use", () => {
    expect(stakePathCapReached([0n, 2n, 5n], 4n, 7n, 1n)).toBe(false);
  });
  it("never blocks a stake of 0", () => {
    expect(stakePathCapReached(four, 4n, 7n, 0n)).toBe(false);
  });
});
