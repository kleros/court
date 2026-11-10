import { ethers } from "ethers";
import Web3 from "web3";
import { appliedRuling, cloneTarget, familyOf, isReasonConfirmed, isRecognisedProxy } from "../helpers/appeal-display";
import { FAMILIES, RECOGNISED_CODE } from "./arbitrable-families";
import {
  createLookupContext,
  createRpc,
  findAllLogs,
  findLogs,
  getBlockHeader,
  getLogs,
  isRangeLimitError,
} from "./reality-question";

// Chain reads behind the case page's decision box (what the arbitrable applied once the execution period started, and
// whether only that ruling was fully funded for an appeal) and behind the losing side's appeal deadline. Everything is
// read from this chain's read-only RPC, never from the subgraph or a backend. A read that fails, or finds anything
// unexpected, gives no answer: it is never taken as "nobody funded" and never cached.

const { Interface } = ethers.utils;
const utils = Web3.utils;
const { toBN } = utils;

const TOPICS = {
  Ruling: utils.sha3("Ruling(address,uint256,uint256)"),
  RulingFunded: utils.sha3("RulingFunded(uint256,uint256,uint256)"),
  AppealPossible: utils.sha3("AppealPossible(uint256,address)"),
  Dispute: utils.sha3("Dispute(address,uint256,uint256,uint256)"),
};

const EIP1967_IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const READ_DEADLINE_MS = 30000;
// On providers that refuse to search the whole chain, the Ruling event is searched for up to 7 days after the execution
// period starts. The longest delay between the two on any executed dispute so far is 2.4 days (Mainnet) and 1.1 hours
// (Gnosis).
const MAX_EXECUTION_DELAY_S = 7 * 24 * 3600;
// Requests or challenges walked back from the newest to find the dispute's. At most 4 are needed today.
const MAX_WALK = 16;
const CACHE_PREFIX = "@@kleros/court/executed-ruling/v1";

const toTopic = (value) => utils.padLeft(utils.toHex(value), 64);
const sameAddress = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
const isZero = (hex) => /^0x0*$/.test(hex);
const check = (condition, what) => {
  if (!condition) throw new Error(`Unexpected ${what}.`);
};

// Calls the view functions of `abi` at `address`: contract(rpc, address, abi)("name", ...args).
const contract = (rpc, address, abi) => async (name, ...args) =>
  abi.decodeFunctionResult(
    name,
    await rpc.send("eth_call", [{ to: address, data: abi.encodeFunctionData(name, args) }, "latest"])
  );

const getCode = (rpc, address) => rpc.send("eth_getCode", [address, "latest"]);
const getStorage = async (rpc, address, slot) =>
  toBN(await rpc.send("eth_getStorageAt", [address, `0x${toBN(slot).toString(16)}`, "latest"]));

// ---------------------------------------------------------------------------------------------------------------------
// Recognition

const recogniseArbitrable = async (rpc, chainId, address) => {
  if (!RECOGNISED_CODE[chainId]) return undefined;
  const code = await getCode(rpc, address);
  const target = cloneTarget(code);
  if (target) return familyOf(chainId, { cloneTargetCodeHash: utils.sha3Raw(await getCode(rpc, target)) });
  const codeHash = utils.sha3Raw(code);
  const implementation = isRecognisedProxy(chainId, codeHash)
    ? `0x${(await getStorage(rpc, address, EIP1967_IMPLEMENTATION_SLOT)).toString(16, 40)}`
    : undefined;
  return familyOf(chainId, { codeHash, implementation });
};

// ---------------------------------------------------------------------------------------------------------------------
// Funding of the last round: each reader returns the rulings fully funded in the round the arbitrable's rule() used.

// hasPaid of a two-sided contract, where side 1 is ruling 1 and side 2 is ruling 2. Both sides funded would have raised
// an appeal, so it is unexpected, as is side 0.
const fundedSides = (hasPaid) => {
  check(!hasPaid[0] && !(hasPaid[1] && hasPaid[2]), "funded sides");
  return ["1", "2"].filter((side) => hasPaid[side]);
};

const sideFundedRulings = (side) => {
  const ruling = String(side);
  check(["0", "1", "2"].includes(ruling), "funded side");
  return ruling === "0" ? [] : [ruling];
};

const requestAbi = (key, extra = "") => [
  `function getRequestInfo(${key}, uint256) view returns (bool disputed, uint256 disputeID, uint256, bool, address[3], uint256 numberOfRounds, uint8, address arbitrator, bytes${extra})`,
  `function getRoundInfo(${key}, uint256, uint256) view returns (bool, uint256[3], bool[3] hasPaid, uint256)`,
];
const T2CR_TOKENS = new Interface([
  "function arbitratorDisputeIDToTokenID(address, uint256) view returns (bytes32)",
  "function getTokenInfo(bytes32) view returns (string, string, address, string, uint8, uint256 numberOfRequests)",
  ...requestAbi("bytes32"),
]);
const T2CR_BADGES = new Interface([
  "function arbitratorDisputeIDToAddress(address, uint256) view returns (address)",
  "function getAddressInfo(address) view returns (uint8, uint256 numberOfRequests)",
  ...requestAbi("address"),
]);
const CURATE_CLASSIC = new Interface([
  "function arbitratorDisputeIDToItem(address, uint256) view returns (bytes32)",
  "function getItemInfo(bytes32) view returns (bytes, uint8, uint256 numberOfRequests)",
  ...requestAbi("bytes32", ", uint256"),
]);
const CURATE_LIGHT = new Interface([
  "function arbitratorDisputeIDToItemID(address, uint256) view returns (bytes32)",
  "function getItemInfo(bytes32) view returns (uint8, uint256 numberOfRequests, uint256)",
  ...requestAbi("bytes32", ", uint256"),
]);

// T2CR and Curate classic/light: dispute -> item -> the one disputed request of this dispute -> its last round.
const readCurateRequest = (abi, itemOf, itemInfo) => async ({ rpc, arbitrable, arbitrator, disputeId }) => {
  const curate = contract(rpc, arbitrable, abi);
  const [item] = await curate(itemOf, arbitrator, disputeId);
  check(!isZero(item), "item");
  const requests = (await curate(itemInfo, item)).numberOfRequests.toNumber();
  const matches = [];
  for (let r = requests - 1; r >= Math.max(0, requests - MAX_WALK); r--) {
    const request = await curate("getRequestInfo", item, r);
    if (request.disputed && request.disputeID.eq(disputeId) && sameAddress(request.arbitrator, arbitrator))
      matches.push({ r, rounds: request.numberOfRounds });
  }
  check(matches.length === 1, "request");
  const [{ r, rounds }] = matches;
  check(rounds.gte(2), "rounds"); // Round 0 holds the deposits, never appeal funding.
  return fundedSides((await curate("getRoundInfo", item, r, rounds.sub(1))).hasPaid);
};

const CURATE_PERMANENT = new Interface([
  "function arbitrator() view returns (address)",
  "function disputeIDToItemID(uint256) view returns (bytes32)",
  "function items(bytes32) view returns (uint8 status, uint128, uint120 challengeCount, address, uint48, uint48, uint256)",
  "function challenges(bytes32, uint256) view returns (uint80, uint8, uint8 roundCount, address, uint256, uint256 disputeID)",
  "function rounds(bytes32, uint256, uint256) view returns (uint8 sideFunded, uint256)",
]);

const readCuratePermanent = async ({ rpc, arbitrable, arbitrator, disputeId }) => {
  const curate = contract(rpc, arbitrable, CURATE_PERMANENT);
  check(sameAddress((await curate("arbitrator"))[0], arbitrator), "arbitrator");
  const [item] = await curate("disputeIDToItemID", disputeId);
  check(!isZero(item), "item");
  const { status, challengeCount } = await curate("items", item);
  check(status <= 3, "item status");
  const challenges = challengeCount.toNumber();
  const matches = [];
  for (let c = challenges - 1; c >= Math.max(0, challenges - MAX_WALK); c--) {
    const challenge = await curate("challenges", item, c);
    if (challenge.disputeID.eq(disputeId)) matches.push({ c, rounds: challenge.roundCount });
  }
  check(matches.length === 1, "challenge");
  const [{ c, rounds }] = matches;
  check(rounds >= 2, "rounds");
  return sideFundedRulings((await curate("rounds", item, c, rounds - 1)).sideFunded);
};

const LINGUO = new Interface([
  "function arbitrator() view returns (address)",
  "function disputeIDtoTaskID(uint256) view returns (uint256)",
  "function tasks(uint256) view returns (uint256, uint256, uint256, uint8 status, uint256, address, uint256, uint256, uint256 disputeID, uint256 ruling)",
  "function getNumberOfRounds(uint256) view returns (uint256)",
  "function getRoundInfo(uint256, uint256) view returns (uint256[3], bool[3] hasPaid, uint256)",
]);

const readLinguo = async ({ rpc, arbitrable, arbitrator, disputeId }) => {
  const linguo = contract(rpc, arbitrable, LINGUO);
  check(sameAddress((await linguo("arbitrator"))[0], arbitrator), "arbitrator");
  const [task] = await linguo("disputeIDtoTaskID", disputeId);
  const { status, disputeID, ruling } = await linguo("tasks", task);
  check(disputeID.eq(disputeId) && (status === 3 || status === 4) && ruling.lte(2), "task");
  const [rounds] = await linguo("getNumberOfRounds", task);
  check(rounds.gte(1) && rounds.lte(64), "rounds");
  return fundedSides((await linguo("getRoundInfo", task, rounds.sub(1))).hasPaid);
};

const POH_V1 = new Interface([
  "function arbitratorDisputeIDToDisputeData(address, uint256) view returns (uint96 challengeID, address submissionID)",
  "function getSubmissionInfo(address) view returns (uint8, uint64, uint64, bool, bool, uint256 numberOfRequests)",
  "function getRequestInfo(address, uint256) view returns (bool, bool, bool, uint8, uint16, uint16 lastChallengeID, uint16 arbitratorDataID, address, address, uint8)",
  "function getChallengeInfo(address, uint256, uint256) view returns (uint16 lastRoundID, address, uint256 disputeID, uint8, uint64)",
  "function getRoundInfo(address, uint256, uint256, uint256) view returns (bool, uint256[3], uint8 sideFunded, uint256)",
  "function arbitratorDataList(uint256) view returns (address arbitrator, uint96, bytes)",
]);

// rule() used the submission's newest request at the time, and newer requests can follow, so the requests are walked
// back from the newest to the first one holding this dispute.
const readPohV1 = async ({ rpc, arbitrable, arbitrator, disputeId }) => {
  const poh = contract(rpc, arbitrable, POH_V1);
  const { challengeID, submissionID } = await poh("arbitratorDisputeIDToDisputeData", arbitrator, disputeId);
  check(!isZero(submissionID), "submission");
  const requests = (await poh("getSubmissionInfo", submissionID)).numberOfRequests.toNumber();
  let match;
  for (let r = requests - 1; r >= Math.max(0, requests - MAX_WALK) && !match; r--) {
    const request = await poh("getRequestInfo", submissionID, r);
    if (!challengeID.lt(request.lastChallengeID)) continue;
    const challenge = await poh("getChallengeInfo", submissionID, r, challengeID);
    if (challenge.disputeID.eq(disputeId)) match = { r, request, challenge };
  }
  check(match, "request");
  const { r, request, challenge } = match;
  check(sameAddress((await poh("arbitratorDataList", request.arbitratorDataID)).arbitrator, arbitrator), "arbitrator");
  check(challenge.lastRoundID >= 1, "rounds"); // Round 0 holds the challenger's deposit.
  return sideFundedRulings((await poh("getRoundInfo", submissionID, r, challengeID, challenge.lastRoundID)).sideFunded);
};

const POH_V2 = new Interface([
  "function disputeIdToData(address, uint256) view returns (uint96 requestId, uint96 challengeId, bytes20 humanityId)",
  "function arbitratorDataHistory(uint256) view returns (uint96, address arbitrator, bytes)",
]);

// PoH v2 has no getter for a challenge's rounds, so they are read from the proxy's storage, laid out as in the
// implementation recognised (line numbers: its source on Gnosis, 0x85b88e38…): humanityData is at slot 61 (:199), a
// Request takes 4 slots and holds its challenges mapping at +3 (:96-110), a Challenge holds its rounds mapping at +2
// (:124-130), and the first slot of a Round holds only sideFunded (:117-122).
const hashWords = (...words) => toBN(utils.sha3Raw(`0x${words.map((word) => toBN(word).toString(16, 64)).join("")}`));
export const pohV2Slots = {
  humanity: (humanityId) => hashWords(humanityId.padEnd(66, "0"), 61),
  request: (humanity, requestId) => hashWords(humanity.addn(3)).add(toBN(requestId).muln(4)),
  challenge: (request, challengeId) => hashWords(challengeId, request.addn(3)),
  round: (challenge, roundId) => hashWords(roundId, challenge.addn(2)),
};

const readPohV2 = async ({ rpc, arbitrable, arbitrator, disputeId }) => {
  const poh = contract(rpc, arbitrable, POH_V2);
  const storage = (slot) => getStorage(rpc, arbitrable, slot);
  const { requestId, challengeId, humanityId } = await poh("disputeIdToData", arbitrator, disputeId);
  check(!isZero(humanityId), "humanity");
  const humanity = pohV2Slots.humanity(humanityId);
  check(requestId.lt((await storage(humanity.addn(3))).toString()), "request");

  // Request slot 0, from the low end: status at byte 1, arbitratorDataId at bytes 4-5, lastChallengeId at bytes 6-7.
  const request = pohV2Slots.request(humanity, requestId.toString());
  const requestWord = await storage(request);
  check(requestWord.shrn(8).andln(0xff) <= 3 && challengeId.lt(requestWord.shrn(48).andln(0xffff)), "request");
  const { arbitrator: requestArbitrator } = await poh("arbitratorDataHistory", requestWord.shrn(32).andln(0xffff));
  check(sameAddress(requestArbitrator, arbitrator), "arbitrator");

  // Challenge slot 0: lastRoundId at bytes 0-1, ruling at byte 2, challenger at bytes 3-22, then zeros.
  const challenge = pohV2Slots.challenge(request, challengeId.toString());
  const challengeWord = await storage(challenge);
  const lastRoundId = challengeWord.andln(0xffff);
  check(
    lastRoundId >= 1 &&
      challengeWord.shrn(16).andln(0xff) <= 2 &&
      !challengeWord.shrn(24).maskn(160).isZero() &&
      challengeWord.shrn(184).isZero(),
    "challenge"
  );
  check((await storage(challenge.addn(1))).eq(toBN(disputeId)), "challenge dispute");
  return sideFundedRulings(await storage(pohV2Slots.round(challenge, lastRoundId)));
};

const ARBITRABLE_PROXY = new Interface([
  "function externalIDtoLocalID(uint256) view returns (uint256)",
  "function disputes(uint256) view returns (bytes, bool isRuled, uint256, uint256 disputeIDOnArbitratorSide)",
]);
const REALITY_SINGLE_CHAIN = new Interface([
  "function externalIDtoLocalID(uint256) view returns (uint256)",
  "function arbitrationRequests(uint256) view returns (uint8 status, address, uint256 disputeID, uint256)",
]);

// These contracts only log their funding: the RulingFunded events of the last round, which can only be emitted during
// its appeal period, from its AppealPossible event to the execution period (`executionBlock` is one of its blocks).
const readRulingFunded = async ({ rpc, arbitrable, arbitrator, disputeId, lastRound, executionBlock }, localId) => {
  // findLogs stops at the newest window with a match, which holds the last AppealPossible event.
  const appealFilter = { address: arbitrator, topics: [TOPICS.AppealPossible, toTopic(disputeId)] };
  const appealPeriods = await findLogs(rpc, appealFilter, 0, executionBlock);
  check(appealPeriods.length > 0, "appeal period");
  const from = Math.max(...appealPeriods.map((log) => utils.hexToNumber(log.blockNumber)));
  const filter = { address: arbitrable, topics: [TOPICS.RulingFunded, toTopic(localId), toTopic(lastRound)] };
  const logs = await findAllLogs(rpc, filter, from, executionBlock);
  return [...new Set(logs.map((log) => toBN(log.topics[3]).toString()))];
};

const readDisputeResolver = async (dispute) => {
  const proxy = contract(dispute.rpc, dispute.arbitrable, ARBITRABLE_PROXY);
  const [localId] = await proxy("externalIDtoLocalID", dispute.disputeId);
  const { isRuled, disputeIDOnArbitratorSide } = await proxy("disputes", localId);
  check(isRuled && disputeIDOnArbitratorSide.eq(dispute.disputeId), "dispute");
  return readRulingFunded(dispute, localId.toString());
};

const readRealitySingleChain = async (dispute) => {
  const proxy = contract(dispute.rpc, dispute.arbitrable, REALITY_SINGLE_CHAIN);
  const [localId] = await proxy("externalIDtoLocalID", dispute.disputeId);
  const { status, disputeID } = await proxy("arbitrationRequests", localId);
  check(disputeID.eq(dispute.disputeId) && (status === 2 || status === 3), "request");
  return readRulingFunded(dispute, localId.toString());
};

const REALITY_CROSS_CHAIN = new Interface([
  "function disputeIDToDisputeDetails(uint256) view returns (uint256 arbitrationID, address requester)",
  "function arbitrationRequests(uint256, address) view returns (uint8, uint248, uint256 disputeID, uint256)",
  "function getNumberOfRounds(uint256) view returns (uint256)",
  "function getRoundInfo(uint256, uint256) view returns (uint256[], uint256, uint256[] fundedAnswers)",
]);

const readRealityCrossChain = async ({ rpc, arbitrable, disputeId, lastRound }) => {
  const proxy = contract(rpc, arbitrable, REALITY_CROSS_CHAIN);
  const { arbitrationID, requester } = await proxy("disputeIDToDisputeDetails", disputeId);
  check(!isZero(requester), "requester");
  check((await proxy("arbitrationRequests", arbitrationID, requester)).disputeID.eq(disputeId), "request");
  const [rounds] = await proxy("getNumberOfRounds", arbitrationID);
  check(rounds.sub(1).eq(lastRound), "rounds");
  return (await proxy("getRoundInfo", arbitrationID, lastRound)).fundedAnswers.map(String);
};

const GOVERNOR = new Interface([
  "function sessions(uint256) view returns (uint256, uint256 disputeID, uint256, uint8 status, uint256)",
  "function getSessionRoundsNumber(uint256) view returns (uint256)",
  "function getRoundInfo(uint256, uint256) view returns (uint256[], bool[] hasPaid, uint256, uint256)",
]);

// The dispute's session is the evidence group of the governor's Dispute event; list i is ruling i + 1.
const readGovernor = async ({ rpc, arbitrable, arbitrator, disputeId, lastRound, executionBlock }) => {
  const governor = contract(rpc, arbitrable, GOVERNOR);
  const filter = { address: arbitrable, topics: [TOPICS.Dispute, toTopic(arbitrator), toTopic(disputeId)] };
  const logs = await findLogs(rpc, filter, 0, executionBlock);
  check(logs.length === 1, "Dispute event");
  const session = toBN(`0x${logs[0].data.slice(66, 130)}`).toString(); // Data: metaEvidenceID, evidenceGroupID.
  const { disputeID, status } = await governor("sessions", session);
  check(disputeID.eq(disputeId) && status === 2, "session");
  const [rounds] = await governor("getSessionRoundsNumber", session);
  check(rounds.sub(1).eq(lastRound), "rounds");
  const { hasPaid } = await governor("getRoundInfo", session, lastRound);
  return hasPaid.flatMap((paid, list) => (paid ? [String(list + 1)] : []));
};

const BINARY_PROXY = new Interface([
  "function arbitrator() view returns (address)",
  "function externalIDtoLocalID(uint256) view returns (uint256)",
  "function disputes(uint256) view returns (bytes, bool isRuled, uint8, uint256 disputeIDOnArbitratorSide)",
  "function crowdfundingStatus(uint256, address) view returns (uint256[3], bool[3] hasPaid, uint256, uint256[3])",
]);

const readBinaryProxy = async ({ rpc, arbitrable, arbitrator, disputeId }) => {
  const proxy = contract(rpc, arbitrable, BINARY_PROXY);
  check(sameAddress((await proxy("arbitrator"))[0], arbitrator), "arbitrator");
  const [localId] = await proxy("externalIDtoLocalID", disputeId);
  const { isRuled, disputeIDOnArbitratorSide } = await proxy("disputes", localId);
  check(isRuled && disputeIDOnArbitratorSide.eq(disputeId), "dispute");
  // The status of the last round, which must be exactly 10 words.
  const data = BINARY_PROXY.encodeFunctionData("crowdfundingStatus", [localId, ethers.constants.AddressZero]);
  const status = await rpc.send("eth_call", [{ to: arbitrable, data }, "latest"]);
  check(status.length === 2 + 2 * 320, "crowdfunding status");
  return fundedSides(BINARY_PROXY.decodeFunctionResult("crowdfundingStatus", status).hasPaid);
};

// The 2019 BinaryArbitrableProxy has no reader: none of its disputes was won by default, and one of its three contracts
// has no funding getter.
const FUNDING_READERS = {
  t2crTokens: readCurateRequest(T2CR_TOKENS, "arbitratorDisputeIDToTokenID", "getTokenInfo"),
  t2crBadges: readCurateRequest(T2CR_BADGES, "arbitratorDisputeIDToAddress", "getAddressInfo"),
  curateClassic: readCurateRequest(CURATE_CLASSIC, "arbitratorDisputeIDToItem", "getItemInfo"),
  curateLight: readCurateRequest(CURATE_LIGHT, "arbitratorDisputeIDToItemID", "getItemInfo"),
  curatePermanent: readCuratePermanent,
  linguo: readLinguo,
  pohV1: readPohV1,
  pohV2: readPohV2,
  disputeResolver: readDisputeResolver,
  realitySingleChain: readRealitySingleChain,
  realityCrossChain: readRealityCrossChain,
  governor: readGovernor,
  binaryProxy: readBinaryProxy,
};

// ---------------------------------------------------------------------------------------------------------------------
// Executed ruling

// The first block whose timestamp is at or after `timestamp`, given a block before it (`low`) and one at or after it
// (`high`). Interpolating takes few requests on regular block times; every other step bisects, so it always converges.
const blockAtTime = async (rpc, timestamp, low, high) => {
  let bisect = false;
  while (high.number - low.number > 1) {
    const interpolated =
      low.number +
      Math.floor(((timestamp - low.timestamp) * (high.number - low.number)) / (high.timestamp - low.timestamp));
    const guess = bisect ? Math.floor((low.number + high.number) / 2) : interpolated;
    const block = await getBlockHeader(rpc, Math.min(high.number - 1, Math.max(low.number + 1, guess)));
    if (block.timestamp >= timestamp) high = block;
    else low = block;
    bisect = !bisect;
  }
  return high;
};

// The blocks the Ruling event is searched in when the whole chain can't be: from the first block of the execution
// period, whose timestamp is the dispute's last period change, to 7 days later or the head.
const executionBlocks = async (rpc, start, head) => {
  const first = await getBlockHeader(rpc, 1);
  check(first.timestamp < start, "execution period start");
  const from = await blockAtTime(rpc, start, first, head);
  const end = start + MAX_EXECUTION_DELAY_S;
  const to = head.timestamp < end ? head : await blockAtTime(rpc, end, from, head);
  return { from: from.number, to: to.number };
};

// The logs matching `filter` from the start of the execution period. The whole chain is searched in one request, and
// only the logs of blocks at or after the start are kept; providers that refuse it are scanned from the start instead.
const findExecutionLogs = async (rpc, filter, lastPeriodChange) => {
  const start = Number(lastPeriodChange);
  const head = await getBlockHeader(rpc, "latest");
  check(start <= head.timestamp, "execution period start");
  let logs;
  try {
    logs = await getLogs(rpc, filter, 0, head.number);
  } catch (err) {
    if (!isRangeLimitError(err)) throw err;
    const blocks = await executionBlocks(rpc, start, head);
    return findAllLogs(rpc, filter, blocks.from, blocks.to);
  }
  const executionLogs = [];
  for (const log of logs)
    if ((await getBlockHeader(rpc, utils.hexToNumber(log.blockNumber))).timestamp >= start) executionLogs.push(log);
  return executionLogs;
};

const readExecutedRuling = async (dispute) => {
  const { chainId, arbitrator, disputeId, arbitrable, lastPeriodChange, courtRuling } = dispute;
  const rpc = createRpc(chainId, createLookupContext(READ_DEADLINE_MS));
  // Only the Ruling events of this dispute's own arbitrable count, and only from the start of the execution period.
  const filter = { address: arbitrable, topics: [TOPICS.Ruling, toTopic(arbitrator), toTopic(disputeId)] };
  const logs = await findExecutionLogs(rpc, filter, lastPeriodChange);
  const applied = appliedRuling(logs.map((log) => log.data));
  if (applied === null || applied === courtRuling) return { applied };
  const executionBlock = utils.hexToNumber(logs[0].blockNumber);

  let reasonConfirmed = false;
  try {
    const reader = FUNDING_READERS[await recogniseArbitrable(rpc, chainId, arbitrable)];
    if (reader) reasonConfirmed = isReasonConfirmed(await reader({ ...dispute, rpc, executionBlock }), applied);
  } catch (err) {
    console.warn(`Could not read the appeal funding of dispute ${disputeId}:`, err);
  }
  return { applied, reasonConfirmed };
};

// Only final answers are cached: an applied ruling equal to the court's, or a confirmed reason.
const isFinal = (value, courtRuling) =>
  Boolean(value) &&
  typeof value.applied === "string" &&
  /^\d+$/.test(value.applied) &&
  (value.applied === courtRuling || value.reasonConfirmed === true);

const readCachedRuling = (key, courtRuling) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key));
    if (isFinal(value, courtRuling)) return value;
  } catch {
    // Unparsable entry or storage unavailable: read the chain.
  }
  return undefined;
};

const inFlightReads = new Map();

/**
 * What the arbitrable of an executed dispute applied, from its Ruling events. `applied` is null when it can't be read
 * (no event, or events with different values). `reasonConfirmed` is true when the dispute's own last round shows the
 * applied ruling as the only one fully funded. Never rejects.
 * @param {{chainId: number, arbitrator: string, disputeId: string, arbitrable: string, lastPeriodChange: string,
 *   courtRuling: string, lastRound: number}} dispute Addresses in lowercase.
 * @returns {Promise<{applied: string|null, reasonConfirmed?: boolean}>}
 */
export const fetchExecutedRuling = async (dispute) => {
  const key = `${CACHE_PREFIX}/${dispute.chainId}/${dispute.arbitrator}/${dispute.disputeId}`;
  const cached = readCachedRuling(key, dispute.courtRuling);
  if (cached) return cached;

  if (!inFlightReads.has(key)) {
    const read = readExecutedRuling(dispute)
      .then((result) => {
        try {
          if (isFinal(result, dispute.courtRuling)) window.localStorage.setItem(key, JSON.stringify(result));
        } catch {
          // Caching is best-effort.
        }
        return result;
      })
      .catch((err) => {
        console.warn(`Could not read the executed ruling of dispute ${dispute.disputeId}:`, err);
        return { applied: null };
      })
      .finally(() => inFlightReads.delete(key));
    inFlightReads.set(key, read);
  }
  return inFlightReads.get(key);
};

// ---------------------------------------------------------------------------------------------------------------------
// Appeal rules

const LOSER_MULTIPLIER = new Interface(["function loserAppealPeriodMultiplier() view returns (uint256)"]);

/**
 * The type of an arbitrable and, when its losing side's deadline depends on it, its live loser multiplier. `family` is
 * undefined when the arbitrable is unknown or can't be read. Never rejects.
 * @returns {Promise<{family?: string, multiplier?: string}>}
 */
export const fetchAppealRules = async ({ chainId, arbitrable }) => {
  try {
    const rpc = createRpc(chainId, createLookupContext(READ_DEADLINE_MS));
    const family = await recogniseArbitrable(rpc, chainId, arbitrable);
    if (!family || FAMILIES[family].loserWindow !== "multiplier") return { family };
    const [multiplier] = await contract(rpc, arbitrable, LOSER_MULTIPLIER)("loserAppealPeriodMultiplier");
    return { family, multiplier: multiplier.toString() };
  } catch (err) {
    console.warn(`Could not read the appeal rules of ${arbitrable}:`, err);
    return {};
  }
};
