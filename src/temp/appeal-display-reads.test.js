import { ethers } from "ethers";
import Web3 from "web3";
import { fetchAppealRules, fetchExecutedRuling, pohV2Slots } from "./appeal-display-reads";
import { LOOKUP_LIMITS } from "./reality-question";

jest.mock("../bootstrap/web3", () => ({ getReadOnlyRpcUrl: (chainId) => `https://rpc.test/${chainId}` }));

// Fake code stands for each recognised type: the real code hashes are tested in helpers/appeal-display.test.js.
jest.mock("./arbitrable-families", () => {
  const { sha3Raw } = require("web3").utils;
  return {
    FAMILIES: jest.requireActual("./arbitrable-families").FAMILIES,
    RECOGNISED_CODE: {
      1: {
        code: { [sha3Raw("0xa1")]: "realitySingleChain", [sha3Raw("0xa2")]: "disputeResolver" },
        cloneTargets: { [sha3Raw("0xa3")]: "curateLight" },
        proxies: {
          [sha3Raw("0xa4")]: { implementation: "0x4444444444444444444444444444444444444444", family: "pohV2" },
        },
      },
    },
  };
});

const { Interface } = ethers.utils;
const utils = Web3.utils;
const { toBN } = utils;

const ARBITRATOR = "0x988b3a538b618c7a603e1c11ab82cd16dbe28069";
const ARBITRABLE = "0x1111111111111111111111111111111111111111";
const CLONE_TARGET = "0x3333333333333333333333333333333333333333";
const CLONE_CODE = `0x363d3d373d3d3d363d73${CLONE_TARGET.slice(2)}5af43d82803e903d91602b57fd5bf3`;
const EIP1967_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

// 12 s blocks. The execution period starts at block 500000.
const T0 = 1600000000;
const timestampOf = (block) => T0 + 12 * block;
const EXECUTION_BLOCK = 500000;
const DAY_BLOCKS = 7200;

const TOPICS = {
  Ruling: utils.sha3("Ruling(address,uint256,uint256)"),
  RulingFunded: utils.sha3("RulingFunded(uint256,uint256,uint256)"),
  AppealPossible: utils.sha3("AppealPossible(uint256,address)"),
};
const pad = (value) => utils.padLeft(utils.toHex(value), 64);
let logCounter = 0;
const log = (address, blockNumber, topics, data = "0x") => ({
  address,
  blockNumber: utils.toHex(blockNumber),
  topics,
  data,
  transactionHash: pad(++logCounter),
  logIndex: "0x0",
});
const rulingLog = (block, ruling, disputeId = 7) =>
  log(ARBITRABLE, block, [TOPICS.Ruling, pad(ARBITRATOR), pad(disputeId)], pad(ruling));

const dispute = (overrides) => ({
  chainId: 1,
  arbitrator: ARBITRATOR,
  disputeId: "7",
  arbitrable: ARBITRABLE,
  lastPeriodChange: String(timestampOf(EXECUTION_BLOCK)),
  courtRuling: "0",
  lastRound: 0,
  ...overrides,
});

// A fake chain: block headers, logs (with a max eth_getLogs range), code, storage and contracts answering eth_call.
let chain;
let calls;
beforeEach(() => {
  calls = [];
  chain = { latest: 600000, maxRange: Infinity, logs: [], code: {}, storage: {}, contracts: {} };
  window.localStorage.clear();
  Object.assign(LOOKUP_LIMITS, { retryDelaysMs: [1, 1] });
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(Web3.providers, "HttpProvider").mockImplementation(() => ({
    send: (payload, callback) => {
      calls.push({ method: payload.method, params: payload.params });
      setTimeout(() => {
        try {
          callback(null, { jsonrpc: "2.0", id: payload.id, ...handle(payload.method, payload.params) });
        } catch (err) {
          callback(err);
        }
      }, 0);
    },
  }));
});
afterEach(() => jest.restoreAllMocks());

const revert = { error: { code: 3, message: "execution reverted" } };
const handle = (method, params) => {
  if (method === "eth_getBlockByNumber") {
    const block = params[0] === "latest" ? chain.latest : utils.hexToNumber(params[0]);
    return { result: { number: utils.toHex(block), timestamp: utils.toHex(timestampOf(block)) } };
  }
  if (method === "eth_getLogs") {
    const { address, topics, fromBlock, toBlock } = params[0];
    const [from, to] = [utils.hexToNumber(fromBlock), utils.hexToNumber(toBlock)];
    if (to - from + 1 > chain.maxRange) return { error: { code: -32005, message: "query exceeds max block range" } };
    const result = chain.logs.filter((l) => {
      const block = utils.hexToNumber(l.blockNumber);
      return l.address === address && block >= from && block <= to && topics.every((t, i) => t === l.topics[i]);
    });
    return { result };
  }
  if (method === "eth_getCode") return { result: chain.code[params[0]] || "0x" };
  if (method === "eth_getStorageAt")
    return { result: pad(chain.storage[params[0]]?.[toBN(params[1]).toString()] || 0) };
  if (method === "eth_call") {
    const contract = chain.contracts[params[0].to];
    if (!contract) return revert;
    const { name, args } = contract.abi.parseTransaction({ data: params[0].data });
    if (!contract.functions[name]) return revert;
    return { result: contract.abi.encodeFunctionResult(name, contract.functions[name](...args)) };
  }
  throw new Error(`Unexpected method ${method}`);
};

const getLogsCalls = () => calls.filter((c) => c.method === "eth_getLogs");

describe("fetchExecutedRuling", () => {
  it("reads the Ruling events from the first block of the execution period and caches a ruling equal to the court's", async () => {
    chain.logs = [
      rulingLog(EXECUTION_BLOCK - 1, 1),
      rulingLog(EXECUTION_BLOCK, 2),
      rulingLog(EXECUTION_BLOCK + 8 * DAY_BLOCKS, 2),
    ];
    expect(await fetchExecutedRuling(dispute({ courtRuling: "2" }))).toEqual({ applied: "2" });
    // The whole chain in one request: the event before the execution period is dropped by its block's timestamp.
    expect(
      getLogsCalls().map(({ params }) => [params[0].fromBlock, params[0].toBlock].map(utils.hexToNumber))
    ).toEqual([[0, chain.latest]]);
    expect(calls).toHaveLength(5); // The head, the logs and the 3 log blocks.

    calls = [];
    expect(await fetchExecutedRuling(dispute({ courtRuling: "2" }))).toEqual({ applied: "2" });
    expect(calls).toHaveLength(0);
  });

  it("scans every window when the provider refuses the whole range", async () => {
    chain.maxRange = 10000;
    chain.logs = [rulingLog(EXECUTION_BLOCK + 5, 2), rulingLog(EXECUTION_BLOCK + 6 * DAY_BLOCKS, 1)];
    expect(await fetchExecutedRuling(dispute({ courtRuling: "2" }))).toEqual({ applied: null });
    // Refused for the whole chain, so scanned from the first block of the execution period, for 7 days.
    const [, ...scans] = getLogsCalls().map(({ params }) =>
      [params[0].fromBlock, params[0].toBlock].map(utils.hexToNumber)
    );
    expect(scans.length).toBeGreaterThan(5);
    expect(Math.min(...scans.map(([from]) => from))).toBe(EXECUTION_BLOCK);
    expect(Math.max(...scans.map(([, to]) => to))).toBe(EXECUTION_BLOCK + 7 * DAY_BLOCKS);
  });

  it("finds only the events of the execution period when scanning from its start", async () => {
    chain.maxRange = 10000;
    chain.logs = [rulingLog(EXECUTION_BLOCK - 1, 1), rulingLog(EXECUTION_BLOCK, 2)];
    expect(await fetchExecutedRuling(dispute({ courtRuling: "2" }))).toEqual({ applied: "2" });
  });

  it("does not cache an unreadable ruling", async () => {
    expect(await fetchExecutedRuling(dispute())).toEqual({ applied: null });
    chain.logs = [rulingLog(EXECUTION_BLOCK + 1, 0)];
    expect(await fetchExecutedRuling(dispute())).toEqual({ applied: "0" });
  });

  it("is unreadable when the RPC has not reached the execution period", async () => {
    chain.latest = EXECUTION_BLOCK - 10;
    expect(await fetchExecutedRuling(dispute())).toEqual({ applied: null });
    expect(getLogsCalls()).toHaveLength(0);
  });

  it("confirms the reason from a Curate light clone's last round (Gnosis 1042)", async () => {
    const item = "0x3b1ea7a279a81c8eb3e12555da61b660b425cc2470ce6b49fab7ba5dc52581ae";
    chain.logs = [rulingLog(EXECUTION_BLOCK + 2, 1)];
    chain.code = { [ARBITRABLE]: CLONE_CODE, [CLONE_TARGET]: "0xa3" };
    const hasPaid = [false, true, false];
    chain.contracts[ARBITRABLE] = {
      abi: new Interface([
        "function arbitratorDisputeIDToItemID(address, uint256) view returns (bytes32)",
        "function getItemInfo(bytes32) view returns (uint8, uint256 numberOfRequests, uint256)",
        "function getRequestInfo(bytes32, uint256) view returns (bool disputed, uint256 disputeID, uint256, bool, address[3], uint256 numberOfRounds, uint8, address arbitrator, bytes, uint256)",
        "function getRoundInfo(bytes32, uint256, uint256) view returns (bool, uint256[3], bool[3] hasPaid, uint256)",
      ]),
      functions: {
        arbitratorDisputeIDToItemID: () => [item],
        getItemInfo: () => [0, 1, 0],
        getRequestInfo: () => [true, 7, 0, true, [ARBITRABLE, ARBITRABLE, ARBITRABLE], 2, 1, ARBITRATOR, "0x", 0],
        getRoundInfo: (key, request, round) => {
          expect([key, request.toNumber(), round.toNumber()]).toEqual([item, 0, 1]);
          return [false, [0, 0, 0], hasPaid, 0];
        },
      },
    };
    expect(await fetchExecutedRuling(dispute({ courtRuling: "2" }))).toEqual({ applied: "1", reasonConfirmed: true });

    // Both sides funded can't be the last round: no reason, and nothing cached.
    hasPaid[2] = true;
    window.localStorage.clear();
    expect(await fetchExecutedRuling(dispute({ courtRuling: "2" }))).toEqual({ applied: "1", reasonConfirmed: false });
    calls = [];
    await fetchExecutedRuling(dispute({ courtRuling: "2" }));
    expect(calls.length).toBeGreaterThan(0);
  });

  it("gives no reason, without reading funding, for an unknown contract", async () => {
    chain.logs = [rulingLog(EXECUTION_BLOCK + 2, 2)];
    chain.code = { [ARBITRABLE]: "0xbeef" };
    expect(await fetchExecutedRuling(dispute())).toEqual({ applied: "2", reasonConfirmed: false });
    expect(calls.filter((c) => c.method === "eth_call")).toHaveLength(0);
  });

  it("reads the funding events of a Reality proxy's last appeal period (Mainnet 1680)", async () => {
    const localId = "0x00000000000000000000000000000000000000000000000000000000000000aa";
    const appealBlock = EXECUTION_BLOCK - 3 * DAY_BLOCKS;
    const funded = (block, round, ruling) =>
      log(ARBITRABLE, block, [TOPICS.RulingFunded, pad(localId), pad(round), pad(ruling)]);
    chain.code = { [ARBITRABLE]: "0xa1" };
    chain.logs = [
      rulingLog(EXECUTION_BLOCK + 2, 1),
      log(ARBITRATOR, appealBlock - 9 * DAY_BLOCKS, [TOPICS.AppealPossible, pad(7), pad(ARBITRABLE)]),
      log(ARBITRATOR, appealBlock, [TOPICS.AppealPossible, pad(7), pad(ARBITRABLE)]),
      funded(appealBlock - 2 * DAY_BLOCKS, 0, 2), // Before the last appeal period: not this round's funding.
      funded(appealBlock + 100, 0, 1),
      funded(appealBlock + 100, 1, 2), // Another round.
    ];
    chain.contracts[ARBITRABLE] = {
      abi: new Interface([
        "function externalIDtoLocalID(uint256) view returns (uint256)",
        "function arbitrationRequests(uint256) view returns (uint8 status, address, uint256 disputeID, uint256)",
      ]),
      functions: {
        externalIDtoLocalID: () => [localId],
        arbitrationRequests: () => [2, ARBITRABLE, 7, 1],
      },
    };
    expect(await fetchExecutedRuling(dispute())).toEqual({ applied: "1", reasonConfirmed: true });
  });

  it("reads PoH v2 funding from its storage (Gnosis 1045)", async () => {
    // The slots of Gnosis 1045 as read on chain.
    const humanityId = "0x7ab05e1aae85e115c1c15c38de416ecc5e28df20";
    const humanity = pohV2Slots.humanity(humanityId);
    const request = pohV2Slots.request(humanity, 0);
    const challenge = pohV2Slots.challenge(request, 0);
    const round = pohV2Slots.round(challenge, 1);
    expect([humanity, request, challenge, round].map((slot) => `0x${slot.toString(16, 64)}`)).toEqual([
      "0x9a93d4803b21a92324cd2df002944680dd09f70b81f40961d0e1a91e414bc438",
      "0x1b2537861c1f97faa436a7f33258be372e378b9ff724264998cdea93bbc11474",
      "0x57b761e690f116d1eb3de8df020972b6cf358e8daeb11c3fe4acbc026eb1b5e1",
      "0x50fd72320093deb6068b5ce734a879d9ba04dd443b2cc34e701ec5c2589e7629",
    ]);

    const challenger = toBN("0x5555555555555555555555555555555555555555");
    chain.logs = [rulingLog(EXECUTION_BLOCK + 2, 2)];
    chain.code = { [ARBITRABLE]: "0xa4" };
    chain.storage[ARBITRABLE] = {
      [toBN(EIP1967_SLOT).toString()]: "0x4444444444444444444444444444444444444444",
      [humanity.addn(3).toString()]: 1, // One request.
      [request.toString()]: toBN(3).shln(8).or(toBN(4).shln(32)).or(toBN(1).shln(48)), // Resolved, data 4, 1 challenge.
      [challenge.toString()]: toBN(1).or(toBN(2).shln(16)).or(challenger.shln(24)), // Last round 1, ruling 2.
      [challenge.addn(1).toString()]: 7,
      [round.toString()]: 2,
    };
    chain.contracts[ARBITRABLE] = {
      abi: new Interface([
        "function disputeIdToData(address, uint256) view returns (uint96, uint96, bytes20)",
        "function arbitratorDataHistory(uint256) view returns (uint96, address arbitrator, bytes)",
      ]),
      functions: {
        disputeIdToData: () => [0, 0, humanityId],
        arbitratorDataHistory: (id) => [0, id.eq(4) ? ARBITRATOR : ARBITRABLE, "0x"],
      },
    };
    expect(await fetchExecutedRuling(dispute())).toEqual({ applied: "2", reasonConfirmed: true });

    // Another implementation behind the proxy: not recognised, so no reason.
    window.localStorage.clear();
    chain.storage[ARBITRABLE][toBN(EIP1967_SLOT).toString()] = "0x9999999999999999999999999999999999999999";
    expect(await fetchExecutedRuling(dispute())).toEqual({ applied: "2", reasonConfirmed: false });
  });
});

describe("fetchAppealRules", () => {
  it("reads the live loser multiplier of a Dispute Resolver proxy", async () => {
    chain.code = { [ARBITRABLE]: "0xa2" };
    chain.contracts[ARBITRABLE] = {
      abi: new Interface(["function loserAppealPeriodMultiplier() view returns (uint256)"]),
      functions: { loserAppealPeriodMultiplier: () => [5000] },
    };
    expect(await fetchAppealRules({ chainId: 1, arbitrable: ARBITRABLE })).toEqual({
      family: "disputeResolver",
      multiplier: "5000",
    });
  });

  it("knows no contract on chains without recognised code, without any request", async () => {
    expect(await fetchAppealRules({ chainId: 11155111, arbitrable: ARBITRABLE })).toEqual({ family: undefined });
    expect(calls).toHaveLength(0);
  });

  it("knows no rules when a read fails", async () => {
    chain.code = { [ARBITRABLE]: "0xa2" }; // The multiplier read reverts.
    expect(await fetchAppealRules({ chainId: 1, arbitrable: ARBITRABLE })).toEqual({});
  });
});
