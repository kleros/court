// @vitest-environment node
import { getAddress, zeroAddress } from "viem";
import { describe, expect, it } from "vitest";
import {
  Period,
  isRoundTallyFinal,
  periodDeadline,
  readAccountVoteSlots,
  readCurrentRuling,
  readDispute,
  readDisputeRounds,
  readVote,
  readVoteCounter,
  showPassPeriod,
} from "./dispute.ts";
import { addresses, calldata, fixtureConfig, words, type Answer, type Word } from "./testing/rpc-fixture.ts";

const E18 = 10n ** 18n;
const MAX_UINT = 2n ** 256n - 1n;
const arbitrable = "0x00000000000000000000000000000000000ab1e0";
const alice = "0x00000000000000000000000000000000000a11ce";
const bob = "0x0000000000000000000000000000000000000b0b";
const carol = "0x00000000000000000000000000000000000ca201";
const commit = `0x${"ab".repeat(32)}` as const;
const zeroCommit = `0x${"00".repeat(32)}` as const;

/** disputes(uint256): the public getter of struct Dispute without its arrays (KlerosLiquid.sol:78-97), 8 static
 * words: uint96 subcourtID, address arbitrated, uint numberOfChoices, uint8 period, uint lastPeriodChange,
 * uint drawsInRound, uint commitsInRound, bool ruled. */
function disputesAnswer(chainId: 1 | 100, id: bigint, fields: readonly Word[]): Answer {
  return {
    chainId,
    to: addresses[chainId].klerosLiquid,
    data: calldata("disputes(uint256)", id),
    result: words(...fields),
  };
}

/** Head of offsets, then each uint[] as length + items. */
function uintArrays(...arrays: readonly (readonly Word[])[]): Word[] {
  const head: Word[] = [];
  const tail: Word[] = [];
  let offset = 32 * arrays.length;
  for (const array of arrays) {
    head.push(offset);
    tail.push(array.length, ...array);
    offset += 32 * (1 + array.length);
  }
  return [...head, ...tail];
}

/** getVote(uint256,uint256,uint256): (address account, bytes32 commit, uint choice, bool voted). */
function voteAnswer(
  id: bigint,
  appeal: number,
  voteID: number,
  account: `0x${string}`,
  vote: Partial<{ commit: `0x${string}`; choice: bigint; voted: boolean }> = {},
): Answer {
  return {
    chainId: 1,
    to: addresses[1].klerosLiquid,
    data: calldata("getVote(uint256,uint256,uint256)", id, appeal, voteID),
    result: words(account, vote.commit ?? zeroCommit, vote.choice ?? 0n, vote.voted ?? false),
  };
}

/** getVoteCounter(uint256,uint256): (uint winningChoice, uint[] counts, bool tied); the array starts after the 3 head
 * words, at 0x60. */
function voteCounterAnswer(
  id: bigint,
  appeal: number,
  winningChoice: bigint,
  counts: readonly Word[],
  tied: boolean,
): Answer {
  return {
    chainId: 1,
    to: addresses[1].klerosLiquid,
    data: calldata("getVoteCounter(uint256,uint256)", id, appeal),
    result: words(winningChoice, 0x60, tied, counts.length, ...counts),
  };
}

describe("readDispute", () => {
  it("decodes the 8 fields of disputes(id) in contract order", async () => {
    const { config, calls } = fixtureConfig([
      disputesAnswer(1, 1042n, [19, arbitrable, 2, 3, 1792413010, 3, 3, false]),
    ]);
    expect(await readDispute(config, 1, 1042n)).toEqual({
      subcourtID: 19n,
      arbitrated: getAddress(arbitrable),
      numberOfChoices: 2n,
      period: Period.appeal,
      lastPeriodChange: 1792413010n,
      drawsInRound: 3n,
      commitsInRound: 3n,
      ruled: false,
    });
    expect(calls).toHaveLength(1);
  });

  it("keeps a huge numberOfChoices exact and reads xKlerosLiquid on chain 100", async () => {
    const { config, calls } = fixtureConfig([
      disputesAnswer(100, 302n, [0, arbitrable, 2n ** 128n - 1n, 4, 1600000000, 500, 0, true]),
    ]);
    const dispute = await readDispute(config, 100, 302n);
    expect(dispute.numberOfChoices).toBe(2n ** 128n - 1n);
    expect(dispute.period).toBe(Period.execution);
    expect(dispute.ruled).toBe(true);
    expect(calls[0]?.to?.toLowerCase()).toBe(addresses[100].klerosLiquid);
  });
});

describe("readDisputeRounds", () => {
  it("decodes the six per-round arrays of getDispute(id)", async () => {
    const { config } = fixtureConfig([
      {
        chainId: 1,
        to: addresses[1].klerosLiquid,
        data: calldata("getDispute(uint256)", 456),
        result: words(
          ...uintArrays(
            [3, 7, 15, 31],
            [620n * E18, 620n * E18, 1240n * E18, 1240n * E18],
            [75n * 10n ** 15n, 175n * 10n ** 15n, 375n * 10n ** 15n, 775n * 10n ** 15n],
            [3, 7, 15, 31],
            [3, 7, 15, 0],
            [0, 1240n * E18, 0, 0],
          ),
        ),
      },
    ]);
    expect(await readDisputeRounds(config, 1, 456n)).toEqual({
      votesLengths: [3n, 7n, 15n, 31n],
      tokensAtStakePerJuror: [620n * E18, 620n * E18, 1240n * E18, 1240n * E18],
      totalFeesForJurors: [75n * 10n ** 15n, 175n * 10n ** 15n, 375n * 10n ** 15n, 775n * 10n ** 15n],
      votesInEachRound: [3n, 7n, 15n, 31n],
      repartitionsInEachRound: [3n, 7n, 15n, 0n],
      penaltiesInEachRound: [0n, 1240n * E18, 0n, 0n],
    });
  });
});

describe("readCurrentRuling", () => {
  it("returns the ruling as an exact bigint (Answered Too Soon = 2^256 - 1)", async () => {
    const { config } = fixtureConfig([
      {
        chainId: 1,
        to: addresses[1].klerosLiquid,
        data: calldata("currentRuling(uint256)", 1657),
        result: words(MAX_UINT),
      },
    ]);
    expect(await readCurrentRuling(config, 1, 1657n)).toBe(MAX_UINT);
  });
});

describe("readVote", () => {
  it("decodes getVote(id, appeal, voteID)", async () => {
    const { config } = fixtureConfig([voteAnswer(1680n, 0, 2, alice, { commit, choice: 1n, voted: true })]);
    expect(await readVote(config, 1, 1680n, 0n, 2n)).toEqual({
      account: getAddress(alice),
      commit,
      choice: 1n,
      voted: true,
    });
  });
});

describe("readAccountVoteSlots", () => {
  // Dispute 456, rounds of 3 and 7 slots. Round 1 is the current round, still drawing: slots 4-6 hold the zero
  // address (drawJurors fills slots in order, KlerosLiquid.sol:478-504).
  const id = 456n;
  const votesLengths = [3n, 7n];
  const answers = [
    voteAnswer(id, 0, 0, alice, { choice: 2n, voted: true }),
    voteAnswer(id, 0, 1, bob, { choice: 1n, voted: true }),
    voteAnswer(id, 0, 2, alice, { choice: 2n, voted: true }),
    voteAnswer(id, 1, 0, carol),
    voteAnswer(id, 1, 1, alice, { commit }),
    voteAnswer(id, 1, 2, bob),
    voteAnswer(id, 1, 3, alice),
    voteAnswer(id, 1, 4, zeroAddress),
    voteAnswer(id, 1, 5, zeroAddress),
    voteAnswer(id, 1, 6, zeroAddress),
  ];
  const alicesCurrent = [
    { appeal: 1n, voteID: 1n, account: getAddress(alice), commit, choice: 0n, voted: false },
    { appeal: 1n, voteID: 3n, account: getAddress(alice), commit: zeroCommit, choice: 0n, voted: false },
  ];

  it('"current" reads every slot of the last round once and keeps the account\'s, in vote ID order', async () => {
    const { config, calls } = fixtureConfig(answers);
    expect(await readAccountVoteSlots(config, 1, id, alice, votesLengths, "current")).toEqual(alicesCurrent);
    expect(calls).toHaveLength(7);
    expect(calls.map((call) => call.data)).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((voteID) => calldata("getVote(uint256,uint256,uint256)", id, 1, voteID)),
    );
    expect(
      calls.every((call) => call.method === "eth_call" && call.to?.toLowerCase() === addresses[1].klerosLiquid),
    ).toBe(true);
  });

  it("sends one getVote per slot of a 63-slot round", async () => {
    const big = Array.from({ length: 63 }, (_, voteID) => voteAnswer(id, 2, voteID, voteID % 20 === 7 ? alice : bob));
    const { config, calls } = fixtureConfig(big);
    const slots = await readAccountVoteSlots(config, 1, id, alice, [3n, 7n, 63n], "current");
    expect(slots.map((slot) => slot.voteID)).toEqual([7n, 27n, 47n]);
    expect(calls).toHaveLength(63);
  });

  it('"all" reads every slot of every round: the sum of votesLengths', async () => {
    const { config, calls } = fixtureConfig(answers);
    expect(await readAccountVoteSlots(config, 1, id, alice, votesLengths, "all")).toEqual([
      { appeal: 0n, voteID: 0n, account: getAddress(alice), commit: zeroCommit, choice: 2n, voted: true },
      { appeal: 0n, voteID: 2n, account: getAddress(alice), commit: zeroCommit, choice: 2n, voted: true },
      ...alicesCurrent,
    ]);
    expect(calls).toHaveLength(10);
  });

  it("matches the account in any letter case", async () => {
    const { config } = fixtureConfig(answers);
    const checksummed = await readAccountVoteSlots(config, 1, id, getAddress(alice), votesLengths, "current");
    const upper = await readAccountVoteSlots(
      config,
      1,
      id,
      `0x${alice.slice(2).toUpperCase()}`,
      votesLengths,
      "current",
    );
    expect(checksummed).toEqual(alicesCurrent);
    expect(upper).toEqual(alicesCurrent);
  });

  it("reads every slot whatever the account holds: one slot, or none", async () => {
    const { config, calls } = fixtureConfig(answers);
    expect(await readAccountVoteSlots(config, 1, id, carol, votesLengths, "all")).toEqual([
      { appeal: 1n, voteID: 0n, account: getAddress(carol), commit: zeroCommit, choice: 0n, voted: false },
    ]);
    expect(
      await readAccountVoteSlots(config, 1, id, "0x00000000000000000000000000000000000d0d0e", votesLengths, "all"),
    ).toEqual([]);
    expect(calls).toHaveLength(20);
  });

  it("never matches the zero address (undrawn slots hold it) and sends nothing for it", async () => {
    const { config, calls } = fixtureConfig(answers);
    expect(await readAccountVoteSlots(config, 1, id, zeroAddress, votesLengths, "current")).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("rejects a value that is not an address before any read", async () => {
    const { config, calls } = fixtureConfig(answers);
    await expect(readAccountVoteSlots(config, 1, id, "0x1234", votesLengths, "current")).rejects.toThrow(
      "Not an address: 0x1234",
    );
    expect(calls).toHaveLength(0);
  });

  it("rejects as a whole when one slot cannot be read, never returning a shorter list", async () => {
    const withoutSlot5 = answers.filter(
      (answer) => answer.data !== calldata("getVote(uint256,uint256,uint256)", id, 1, 5),
    );
    const { config } = fixtureConfig(withoutSlot5);
    await expect(readAccountVoteSlots(config, 1, id, alice, votesLengths, "current")).rejects.toThrow();
  });
});

describe("isRoundTallyFinal", () => {
  it("is final for earlier rounds, and for the current round from the appeal period on", () => {
    expect(isRoundTallyFinal(0n, 1n, Period.evidence)).toBe(true);
    expect(isRoundTallyFinal(1n, 1n, Period.vote)).toBe(false);
    expect(isRoundTallyFinal(1n, 1n, Period.commit)).toBe(false);
    expect(isRoundTallyFinal(1n, 1n, Period.appeal)).toBe(true);
    expect(isRoundTallyFinal(1n, 1n, Period.execution)).toBe(true);
  });
});

describe("readVoteCounter", () => {
  const id = 1325n;
  const answers = [voteCounterAnswer(id, 0, 1n, [0, 1, 0], false), voteCounterAnswer(id, 1, 0n, [0, 1, 1], true)];

  it("reads a final round's counter", async () => {
    const { config, calls } = fixtureConfig(answers);
    expect(await readVoteCounter(config, 1, id, 0n, { numberOfChoices: 2n, period: Period.vote }, 1n)).toEqual({
      winningChoice: 1n,
      counts: [0n, 1n, 0n],
      tied: false,
    });
    expect(await readVoteCounter(config, 1, id, 1n, { numberOfChoices: 2n, period: Period.appeal }, 1n)).toEqual({
      winningChoice: 0n,
      counts: [0n, 1n, 1n],
      tied: true,
    });
    expect(calls).toHaveLength(2);
  });

  it("sends nothing for the current round before the appeal period", async () => {
    const { config, calls } = fixtureConfig(answers);
    expect(await readVoteCounter(config, 1, id, 1n, { numberOfChoices: 2n, period: Period.vote }, 1n)).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it("sends nothing above 512 choices, where getVoteCounter would revert, and reads at exactly 512", async () => {
    const { config, calls } = fixtureConfig([voteCounterAnswer(id, 0, 1n, [0, 1], false)]);
    const final = { period: Period.execution } as const;
    expect(await readVoteCounter(config, 1, id, 0n, { ...final, numberOfChoices: 513n }, 0n)).toBeUndefined();
    expect(await readVoteCounter(config, 1, id, 0n, { ...final, numberOfChoices: MAX_UINT }, 0n)).toBeUndefined();
    expect(calls).toHaveLength(0);
    expect((await readVoteCounter(config, 1, id, 0n, { ...final, numberOfChoices: 512n }, 0n))?.counts).toEqual([
      0n,
      1n,
    ]);
    expect(calls).toHaveLength(1);
  });
});

describe("periodDeadline", () => {
  const timesPerPeriod = [280800n, 583200n, 583200n, 388800n] as const;
  const lastPeriodChange = 1792413010n;

  it("is (lastPeriodChange + timesPerPeriod[period]) * 1000 ms in periods 0-3", () => {
    // Sums done by hand: 1792413010 + 280800, + 583200, + 583200, + 388800.
    const expected = [1792693810000, 1792996210000, 1792996210000, 1792801810000];
    for (const period of [0, 1, 2, 3])
      expect(periodDeadline({ period, lastPeriodChange }, timesPerPeriod)).toBe(expected[period]);
  });

  it("is null in the execution period", () => {
    expect(periodDeadline({ period: Period.execution, lastPeriodChange }, timesPerPeriod)).toBeNull();
  });
});

describe("showPassPeriod", () => {
  const timesPerPeriod = [100n, 200n, 300n, 400n] as const;
  const commitPeriod = { period: Period.commit, lastPeriodChange: 1_000_000n, ruled: false };

  it("turns true only when more than timesPerPeriod[period] + 3600 s have passed, on whole seconds", () => {
    // 1_000_000 + 200 + 3600 = 1_003_800: equal is not enough, and 999 ms do not make a second.
    expect(showPassPeriod(commitPeriod, timesPerPeriod, 1_003_800_000)).toBe(false);
    expect(showPassPeriod(commitPeriod, timesPerPeriod, 1_003_800_999)).toBe(false);
    expect(showPassPeriod(commitPeriod, timesPerPeriod, 1_003_801_000)).toBe(true);
    expect(showPassPeriod({ ...commitPeriod, period: Period.evidence }, timesPerPeriod, 1_003_701_000)).toBe(true);
  });

  it("is always true in the execution period (Execute Ruling) and false once ruled", () => {
    const execution = { period: Period.execution, lastPeriodChange: 1_000_000n, ruled: false };
    expect(showPassPeriod(execution, timesPerPeriod, 1_000_000_000)).toBe(true);
    expect(showPassPeriod({ ...execution, ruled: true }, timesPerPeriod, 9_000_000_000)).toBe(false);
  });
});
