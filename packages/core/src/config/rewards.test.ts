import { describe, expect, it } from "vitest";
import { toAddress, toChecksum } from "../kernel/index.ts";
import { KLEROSBOARD_URL, MERKLE_REDEEM } from "./index.ts";

describe("reward contracts and Klerosboard (spec 04.2, 04.11)", () => {
  it("MerkleRedeem is today's contract on each chain, kept lowercase", () => {
    expect(toChecksum(MERKLE_REDEEM[1])).toBe("0xdbc3088Dfebc3cc6A84B0271DaDe2696DB00Af38");
    expect(toChecksum(MERKLE_REDEEM[100])).toBe("0xf1A9589880DbF393F32A5b2d5a0054Fa10385074");
    for (const address of Object.values(MERKLE_REDEEM)) expect(toAddress(address)).toBe(address);
    expect(Object.keys(MERKLE_REDEEM)).toEqual(["1", "100"]);
  });

  it("Klerosboard is today's subgraph on each chain", () => {
    expect(KLEROSBOARD_URL).toEqual({
      1: "https://api.studio.thegraph.com/query/66145/klerosboard-mainnet/version/latest",
      100: "https://api.studio.thegraph.com/query/66145/klerosboard-gnosis/version/latest",
    });
  });
});
