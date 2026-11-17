// @vitest-environment node
import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";
import {
  readCourtStake,
  readJuror,
  readMaxStakePaths,
  readPnkBalance,
  readSideChainTokenStats,
  readXPnkBalance,
} from "./juror.ts";
import { addresses, calldata, fixtureConfig, words, type Answer, type Word } from "./testing/rpc-fixture.ts";

const E18 = 10n ** 18n;
const juror = "0x00000000000000000000000000000000000a11ce";

/**
 * KlerosLiquidExtraViews.getJuror(address) answer, laid out by hand:
 * (uint96[] subcourtIDs, uint stakedTokens, uint lockedTokens, uint[] subcourtStakes).
 * Head is 4 words; the first array starts at 0x80, the second after the first's length word and items.
 */
function getJurorAnswer(
  chainId: 1 | 100,
  account: `0x${string}`,
  subcourtIDs: readonly Word[],
  stakedTokens: bigint,
  lockedTokens: bigint,
  subcourtStakes: readonly Word[],
): Answer {
  const second = 0x80 + 32 * (1 + subcourtIDs.length);
  return {
    chainId,
    to: addresses[chainId].klerosLiquidExtraViews,
    data: calldata("getJuror(address)", account),
    result: words(
      0x80,
      stakedTokens,
      lockedTokens,
      second,
      subcourtIDs.length,
      ...subcourtIDs,
      subcourtStakes.length,
      ...subcourtStakes,
    ),
  };
}

describe("readJuror", () => {
  it("de-duplicates the slots, drops empty ones and shifts IDs back by one, in slot order", async () => {
    const { config } = fixtureConfig([
      getJurorAnswer(1, juror, [3, 0, 3, 1], 5000n * E18, 600n * E18, [10n, 0n, 20n, 30n]),
    ]);
    expect(await readJuror(config, 1, juror)).toEqual({
      courtIds: [2n, 0n],
      stakedTokens: 5000n * E18,
      lockedTokens: 600n * E18,
    });
  });

  it("gives no courts for a juror with only empty slots (the zero address master uses without a wallet)", async () => {
    const { config } = fixtureConfig([getJurorAnswer(1, zeroAddress, [0, 0, 0, 0], 0n, 0n, [0, 0, 0, 0])]);
    expect(await readJuror(config, 1, zeroAddress)).toEqual({ courtIds: [], stakedTokens: 0n, lockedTokens: 0n });
  });

  it("reads the Gnosis views on chain 100", async () => {
    const { config, calls } = fixtureConfig([getJurorAnswer(100, juror, [1, 9, 0, 0], 7n, 1n, [3, 4, 0, 0])]);
    expect((await readJuror(config, 100, juror)).courtIds).toEqual([0n, 8n]);
    expect(calls[0]?.to?.toLowerCase()).toBe(addresses[100].klerosLiquidExtraViews);
  });
});

describe("readCourtStake", () => {
  it("calls KlerosLiquidExtraViews.stakeOf(account, court)", async () => {
    const { config } = fixtureConfig([
      {
        chainId: 1,
        to: addresses[1].klerosLiquidExtraViews,
        data: calldata("stakeOf(address,uint96)", juror, 5),
        result: words(1234n * E18),
      },
    ]);
    expect(await readCourtStake(config, 1, juror, 5n)).toBe(1234n * E18);
  });
});

describe("readMaxStakePaths", () => {
  it("reads KlerosLiquid.MAX_STAKE_PATHS()", async () => {
    const { config } = fixtureConfig([
      { chainId: 100, to: addresses[100].klerosLiquid, data: calldata("MAX_STAKE_PATHS()"), result: words(4) },
    ]);
    expect(await readMaxStakePaths(config, 100)).toBe(4n);
  });
});

function balanceAnswer(chainId: 1 | 100, to: `0x${string}`, account: `0x${string}`, balance: bigint): Answer {
  return { chainId, to, data: calldata("balanceOf(address)", account), result: words(balance) };
}

describe("readPnkBalance", () => {
  it("reads the chain's Pinakion: PNK on Ethereum, stPNK on Gnosis", async () => {
    const { config } = fixtureConfig([
      balanceAnswer(1, addresses[1].pinakion, juror, 111n),
      balanceAnswer(100, addresses[100].pinakion, juror, 222n),
    ]);
    expect(await readPnkBalance(config, 1, juror)).toBe(111n);
    expect(await readPnkBalance(config, 100, juror)).toBe(222n);
  });
});

describe("readXPnkBalance", () => {
  it("reads xPNK on Gnosis", async () => {
    const { config, calls } = fixtureConfig([balanceAnswer(100, addresses[100].rawPinakion, juror, 9n)]);
    expect(await readXPnkBalance(config, juror)).toBe(9n);
    expect(calls.map((c) => c.chainId)).toEqual([100]);
  });

  it("fails when the xPNK address is not configured", async () => {
    const { config } = fixtureConfig([]);
    const without = { ...config, contracts: { 100: { ...addresses[100], rawPinakion: undefined } } };
    await expect(readXPnkBalance(without, juror)).rejects.toThrow("No rawPinakion address configured for chain 100");
  });
});

describe("readSideChainTokenStats", () => {
  /** jurors(address) = (uint stakedTokens, uint lockedTokens); its lockedTokens differs on purpose: master uses
   * the views' lockedTokens. */
  function statsAnswers(balance: bigint, staked: bigint, stakedPlusPending: bigint, locked: bigint): Answer[] {
    return [
      balanceAnswer(100, addresses[100].pinakion, juror, balance),
      {
        chainId: 100,
        to: addresses[100].klerosLiquid,
        data: calldata("jurors(address)", juror),
        result: words(staked, locked + 1n),
      },
      getJurorAnswer(100, juror, [1, 0, 0, 0], stakedPlusPending, locked, [staked, 0, 0, 0]),
    ];
  }

  it("leaves out pendingStake when nothing is queued", async () => {
    const { config } = fixtureConfig(statsAnswers(10_000n, 6_000n, 6_000n, 1_000n));
    const stats = await readSideChainTokenStats(config, juror);
    expect(stats).toEqual({ balance: 10_000n, staked: 6_000n, locked: 1_000n, available: 4_000n });
    expect("pendingStake" in stats).toBe(false);
  });

  it("reports a queued stake as pendingStake, positive or negative", async () => {
    const up = fixtureConfig(statsAnswers(10_000n, 6_000n, 7_000n, 1_000n));
    expect((await readSideChainTokenStats(up.config, juror)).pendingStake).toBe(1_000n);
    const down = fixtureConfig(statsAnswers(10_000n, 6_000n, 5_000n, 1_000n));
    expect((await readSideChainTokenStats(down.config, juror)).pendingStake).toBe(-1_000n);
  });

  it("takes the smaller of balance − locked and balance − staked, never below 0", async () => {
    const lockedBinds = fixtureConfig(statsAnswers(10_000n, 1_000n, 1_000n, 4_000n));
    expect((await readSideChainTokenStats(lockedBinds.config, juror)).available).toBe(6_000n);
    const short = fixtureConfig(statsAnswers(500n, 6_000n, 6_000n, 0n));
    expect((await readSideChainTokenStats(short.config, juror)).available).toBe(0n);
  });

  /** A config whose chain-100 contracts lack the given addresses; everything else answers. */
  function without(...names: (keyof (typeof addresses)[100])[]) {
    const { config, calls } = fixtureConfig(statsAnswers(10_000n, 6_000n, 6_000n, 1_000n));
    const contracts = { ...addresses[100], ...Object.fromEntries(names.map((name) => [name, undefined])) };
    return { config: { ...config, contracts: { 100: contracts } }, calls };
  }

  it("checks all three addresses before it starts any read (master checks them when it creates the API)", async () => {
    const { config, calls } = without("klerosLiquid");
    await expect(readSideChainTokenStats(config, juror)).rejects.toThrow(
      "No klerosLiquid address configured for chain 100",
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual([]);
  });

  it("rejects once, with nothing left unhandled, when several addresses are missing", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const { config, calls } = without("pinakion", "klerosLiquid");
      // Master's order (create-side-chain-api.js:26-32): the stPNK token, then the views, then KlerosLiquid.
      await expect(readSideChainTokenStats(config, juror)).rejects.toThrow(
        "No pinakion address configured for chain 100",
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).toEqual([]);
      expect(calls).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
