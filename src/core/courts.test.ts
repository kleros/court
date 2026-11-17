// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readCourtParams, readPolicyUri, readSubcourt } from "./courts.ts";
import { readCourtTree } from "./testing/court-tree.ts";
import { addresses, calldata, fixtureConfig, stringResult, words, type Answer } from "./testing/rpc-fixture.ts";

const E18 = 10n ** 18n;

interface FixtureCourt {
  readonly id: bigint;
  readonly parent: bigint;
  readonly hiddenVotes: boolean;
  readonly minStake: bigint;
  readonly alpha: bigint;
  readonly feeForJuror: bigint;
  readonly jurorsForCourtJump: bigint;
  readonly children: readonly bigint[];
  readonly timesPerPeriod: readonly [bigint, bigint, bigint, bigint];
  readonly policyUri: string;
}

/** The three eth_call answers for one court, laid out by hand from KlerosLiquid.sol and PolicyRegistry. */
function courtAnswers(chainId: 1 | 100, court: FixtureCourt): Answer[] {
  const { klerosLiquid, policyRegistry } = addresses[chainId];
  return [
    {
      chainId,
      to: klerosLiquid,
      data: calldata("courts(uint256)", court.id),
      // (uint96 parent, bool hiddenVotes, uint minStake, uint alpha, uint feeForJuror, uint jurorsForCourtJump)
      result: words(
        court.parent,
        court.hiddenVotes,
        court.minStake,
        court.alpha,
        court.feeForJuror,
        court.jurorsForCourtJump,
      ),
    },
    {
      chainId,
      to: klerosLiquid,
      data: calldata("getSubcourt(uint96)", court.id),
      // (uint[] children, uint[4] timesPerPeriod): head = children offset + 4 inline words, so the offset is 5 * 32.
      result: words(0xa0, ...court.timesPerPeriod, court.children.length, ...court.children),
    },
    {
      chainId,
      to: policyRegistry,
      data: calldata("policies(uint256)", court.id),
      result: stringResult(court.policyUri),
    },
  ];
}

const general: FixtureCourt = {
  id: 0n,
  parent: 0n,
  hiddenVotes: false,
  minStake: 2300n * E18,
  alpha: 3100n,
  feeForJuror: 21_500_000_000_000_000n,
  jurorsForCourtJump: 511n,
  children: [1n, 2n],
  timesPerPeriod: [280800n, 583200n, 583200n, 388800n],
  policyUri: "/ipfs/QmWZ5Wv6Lh5tZx6d6r3yE6Lz1qG8vBz4dYJp9rK3s7XyAb/General-Court-Policy.json",
};
const blockchain: FixtureCourt = {
  id: 1n,
  parent: 0n,
  hiddenVotes: true,
  minStake: 4000n * E18,
  alpha: 5000n,
  feeForJuror: 30_000_000_000_000_000n,
  jurorsForCourtJump: 63n,
  children: [3n],
  timesPerPeriod: [432000n, 345600n, 345600n, 259200n],
  policyUri: "",
};
const marketing: FixtureCourt = {
  ...blockchain,
  id: 2n,
  hiddenVotes: false,
  children: [],
  policyUri: "ipfs://QmShortPolicy",
};
const technical: FixtureCourt = { ...blockchain, id: 3n, parent: 1n, children: [], policyUri: "/ipfs/QmTechnical" };

function expected(court: FixtureCourt) {
  return { ...court, children: [...court.children], timesPerPeriod: [...court.timesPerPeriod] };
}

describe("readCourtParams", () => {
  it("decodes KlerosLiquid.courts(id) with one call and nothing else", async () => {
    const { config, calls } = fixtureConfig(courtAnswers(1, general));
    expect(await readCourtParams(config, 1, 0n)).toEqual({
      parent: 0n,
      hiddenVotes: false,
      minStake: 2300n * E18,
      alpha: 3100n,
      feeForJuror: 21_500_000_000_000_000n,
      jurorsForCourtJump: 511n,
    });
    expect(calls.map((c) => c.data)).toEqual([calldata("courts(uint256)", 0n)]);
  });

  it("reads without a PolicyRegistry address: master reads courts(id) and policies(id) separately", async () => {
    const { config, calls } = fixtureConfig(courtAnswers(1, blockchain));
    const withoutRegistry = { ...config, contracts: { 1: { ...addresses[1], policyRegistry: undefined } } };
    const params = await readCourtParams(withoutRegistry, 1, 1n);
    expect(params.minStake).toBe(4000n * E18);
    expect(params.feeForJuror).toBe(30_000_000_000_000_000n);
    expect(calls).toHaveLength(1);
  });

  it("reads when getSubcourt(id) would fail: master's court card and stake modal never call it", async () => {
    const [courts] = courtAnswers(1, blockchain);
    const { config } = fixtureConfig([courts!]);
    expect((await readCourtParams(config, 1, 1n)).hiddenVotes).toBe(true);
    await expect(readSubcourt(config, 1, 1n)).rejects.toThrow();
  });

  it("reads the chain's own contracts", async () => {
    const { config, calls } = fixtureConfig(courtAnswers(100, general));
    expect((await readCourtParams(config, 100, 0n)).minStake).toBe(2300n * E18);
    expect(calls.map((c) => [c.chainId, c.to?.toLowerCase()])).toEqual([[100, addresses[100].klerosLiquid]]);
  });

  it("fails like master's getReadOnlyRpcUrl when the chain has no read RPC, before any request", async () => {
    const { config, calls } = fixtureConfig(courtAnswers(1, general));
    await expect(readCourtParams(config, 11155111, 0n)).rejects.toThrow("Unsupported chain ID: 11155111");
    await expect(readSubcourt(config, 11155111, 0n)).rejects.toThrow("Unsupported chain ID: 11155111");
    await expect(readPolicyUri(config, 11155111, 0n)).rejects.toThrow("Unsupported chain ID: 11155111");
    expect(calls).toEqual([]);
  });

  it("rejects when the RPC fails", async () => {
    const { config } = fixtureConfig([]);
    await expect(readCourtParams(config, 1, 0n)).rejects.toThrow();
  });
});

describe("readSubcourt", () => {
  it("decodes KlerosLiquid.getSubcourt(id): children in contract order and timesPerPeriod, one call", async () => {
    const { config, calls } = fixtureConfig(courtAnswers(1, general));
    expect(await readSubcourt(config, 1, 0n)).toEqual({
      children: [1n, 2n],
      timesPerPeriod: [280800n, 583200n, 583200n, 388800n],
    });
    expect(calls.map((c) => c.data)).toEqual([calldata("getSubcourt(uint96)", 0n)]);
  });

  it("reads a court with no children", async () => {
    const { config } = fixtureConfig(courtAnswers(1, marketing));
    expect((await readSubcourt(config, 1, 2n)).children).toEqual([]);
  });
});

describe("readPolicyUri", () => {
  it("reads PolicyRegistry.policies(id) as stored, with one call", async () => {
    const { config, calls } = fixtureConfig(courtAnswers(1, general));
    expect(await readPolicyUri(config, 1, 0n)).toBe(general.policyUri);
    expect(calls.map((c) => [c.to?.toLowerCase(), c.data])).toEqual([
      [addresses[1].policyRegistry, calldata("policies(uint256)", 0n)],
    ]);
  });

  it("returns an empty policy URI as stored", async () => {
    const { config } = fixtureConfig(courtAnswers(1, blockchain));
    expect(await readPolicyUri(config, 1, 1n)).toBe("");
  });

  it("is the only court read that fails without a PolicyRegistry address, before any request", async () => {
    const { config, calls } = fixtureConfig(courtAnswers(1, general));
    const withoutRegistry = { ...config, contracts: { 1: { ...addresses[1], policyRegistry: undefined } } };
    await expect(readPolicyUri(withoutRegistry, 1, 0n)).rejects.toThrow(
      "No policyRegistry address configured for chain 1",
    );
    expect(calls).toEqual([]);
  });
});

describe("readCourtTree", () => {
  it("walks from the General Court through children, parents before children, each court read once", async () => {
    const { config, calls } = fixtureConfig(
      [general, blockchain, marketing, technical].flatMap((c) => courtAnswers(1, c)),
    );
    const tree = await readCourtTree(config, 1);
    expect(tree.map((c) => c.id)).toEqual([0n, 1n, 2n, 3n]);
    expect(tree).toEqual([general, blockchain, marketing, technical].map(expected));
    expect(calls).toHaveLength(12);
    expect(new Set(calls.map((c) => c.data)).size).toBe(12);
  });

  it("reads a court listed under two parents once", async () => {
    const twice: FixtureCourt = { ...marketing, children: [3n] };
    const { config, calls } = fixtureConfig([general, blockchain, twice, technical].flatMap((c) => courtAnswers(1, c)));
    const tree = await readCourtTree(config, 1);
    expect(tree.map((c) => c.id)).toEqual([0n, 1n, 2n, 3n]);
    expect(calls).toHaveLength(12);
  });

  it("stops at a court that lists the General Court as a child", async () => {
    const loop: FixtureCourt = { ...marketing, children: [0n] };
    const { config } = fixtureConfig([{ ...general, children: [2n] }, loop].flatMap((c) => courtAnswers(1, c)));
    expect((await readCourtTree(config, 1)).map((c) => c.id)).toEqual([0n, 2n]);
  });

  it("fails as a whole when one court's read fails (all or nothing; screens use the per-court reads)", async () => {
    const { config } = fixtureConfig([general, blockchain, marketing].flatMap((c) => courtAnswers(1, c)));
    await expect(readCourtTree(config, 1)).rejects.toThrow();
  });
});
