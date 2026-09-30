import Web3 from "web3";
import { getReadOnlyRpcUrl } from "../bootstrap/web3";
import { REALITY_PROXIES } from "./reality-proxies";
import { KNOWN_DISPUTE_QUESTIONS, REGISTRY_SNAPSHOT_BLOCKS } from "./reality-known-questions";

// Looks up the Reality.eth question behind a Kleros dispute directly from the chain, without relying on the dispute's
// dynamic script. The dynamic scripts of Reality.eth proxies render the question with reality-eth-lib, whose template
// population lets crafted question parameters alter the resulting question JSON (and therefore the ruling options).
//
// This runs in users' browsers, for case lists too, against RPC providers with varying eth_getLogs limits, so:
// - disputes created up to REGISTRY_SNAPSHOT_BLOCKS have their question ID and question block precomputed
//   (reality-known-questions.js) and need only a few single-block requests;
// - newer disputes are searched only after the snapshot block, newest blocks first, with a request budget, a deadline
//   and a per-request timeout, then their question is searched backwards from the dispute creation;
// - results are immutable, so they are cached in localStorage and concurrent lookups of a dispute are shared.

const utils = Web3.utils;
const abi = new Web3().eth.abi;

const TOPICS = {
  // Single-chain proxies (Realitio_v2_1_ArbitratorWithAppeals, RealitioArbitratorProxy...).
  DisputeIDToQuestionID: utils.sha3("DisputeIDToQuestionID(uint256,bytes32)"),
  // Cross-chain foreign proxies (RealitioForeignArbitrationProxy...).
  ArbitrationCreated: utils.sha3("ArbitrationCreated(bytes32,address,uint256)"),
  // Reality.eth v2 / v3.
  LogNewQuestion: utils.sha3(
    "LogNewQuestion(bytes32,address,uint256,string,bytes32,address,uint32,uint32,uint256,uint256)"
  ),
  LogNewTemplate: utils.sha3("LogNewTemplate(uint256,address,string)"),
};

const TEMPLATES_ABI = { name: "templates", type: "function", inputs: [{ name: "", type: "uint256" }] };
const ARBITRATION_CREATED_BLOCK_ABI = {
  name: "arbitrationCreatedBlock",
  type: "function",
  inputs: [{ name: "", type: "uint256" }],
};

// Tunables, exported for tests.
export const LOOKUP_LIMITS = {
  requestTimeoutMs: 20000, // Per JSON-RPC request.
  deadlineMs: 90000, // Per lookup.
  requestBudget: 1500, // Per lookup, retries included.
  retryDelaysMs: [500, 2000], // Backoff of the retries of non range-limit errors.
  windowSize: 10000, // First eth_getLogs window when the whole range is refused.
  minWindowSize: 100,
  windowShrinkFactor: 5,
  concurrency: 8, // Windows fetched in parallel.
};

const CACHE_PREFIX = "@@kleros/court/reality-question/v1";

export const getRealityProxy = (arbitratorChainId, arbitrable) =>
  arbitrable ? REALITY_PROXIES[`${Number(arbitratorChainId)}:${String(arbitrable).toLowerCase()}`] : undefined;

const toTopic = (value) => utils.padLeft(utils.toHex(value), 64);
const toHexBlock = (block) => utils.toHex(block);

// ---------------------------------------------------------------------------------------------------------------------
// JSON-RPC

const RATE_LIMIT_ERROR = /rate[\s-]?limit|too many requests|\b429\b|capacity|throughput|request count|compute units/i;
const RANGE_LIMIT_ERROR = /range|limit|exceed|too many|too large|10[,_]?000|response size|size exceeded|more than|\b413\b|timeout|timed out/i;
const RANGE_LIMIT_CODES = [-32005, -32602, -32600, -32614, 413];

// Whether eth_getLogs failed because the range or the result is too large for the provider (as opposed to a transient
// or unrelated failure). Rate limiting reuses some of the same wording and codes, so it is excluded first. Timeouts count
// as range limits: retrying a request that is too heavy to answer in time would only burn the deadline.
export const isRangeLimitError = (err) => {
  if (err && err.lookupLimit) return false;
  const message = String((err && err.message) || err || "");
  if (RATE_LIMIT_ERROR.test(message)) return false;
  if (err && RANGE_LIMIT_CODES.includes(Number(err.code))) return true;
  return RANGE_LIMIT_ERROR.test(message);
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// State shared by all the requests of one lookup: request budget and deadline.
const createLookupContext = () => ({ requests: 0, deadline: Date.now() + LOOKUP_LIMITS.deadlineMs });

const lookupLimitError = (message) => Object.assign(new Error(message), { lookupLimit: true });

const createRpc = (chainId, context) => {
  const provider = new Web3.providers.HttpProvider(getReadOnlyRpcUrl(chainId), {
    timeout: LOOKUP_LIMITS.requestTimeoutMs,
  });
  let nextId = 0;

  const sendOnce = (method, params) => {
    if (context.requests >= LOOKUP_LIMITS.requestBudget)
      throw lookupLimitError(`Reality question lookup exceeded its budget of ${LOOKUP_LIMITS.requestBudget} requests.`);
    if (Date.now() > context.deadline)
      throw lookupLimitError(`Reality question lookup exceeded its ${LOOKUP_LIMITS.deadlineMs} ms deadline.`);
    context.requests++;
    nextId++;
    return new Promise((resolve, reject) => {
      provider.send({ jsonrpc: "2.0", id: nextId, method, params }, (err, response) => {
        if (err) return reject(err);
        if (!response || response.error) {
          const rpcError = (response && response.error) || {};
          const error = new Error(rpcError.message || `Invalid JSON-RPC response to ${method}.`);
          error.code = rpcError.code;
          error.data = rpcError.data;
          return reject(error);
        }
        resolve(response.result);
      });
    });
  };

  // Range-limit errors are returned to the caller (which narrows the range), others are retried with backoff.
  const send = async (method, params, { retries = LOOKUP_LIMITS.retryDelaysMs.length } = {}) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await sendOnce(method, params);
      } catch (err) {
        const rangeLimited = method === "eth_getLogs" && isRangeLimitError(err);
        if (attempt >= retries || rangeLimited || err.lookupLimit) throw err;
        await delay(LOOKUP_LIMITS.retryDelaysMs[attempt]);
      }
    }
  };

  return { chainId, send };
};

const getBlockNumber = async (rpc) => utils.hexToNumber(await rpc.send("eth_blockNumber", []));

const callUint = async (rpc, to, fragment, arg, options) => {
  const data = abi.encodeFunctionCall(fragment, [String(arg)]);
  const result = await rpc.send("eth_call", [{ to, data }, "latest"], options);
  return Number(abi.decodeParameter("uint256", result));
};

// Logs are deduplicated by (transactionHash, logIndex): some providers return the same log twice across ranges.
const uniqueLogs = (logs) => {
  const seen = new Set();
  return logs.filter((log) => {
    if (!log || log.removed) return false;
    const id = `${String(log.transactionHash).toLowerCase()}:${Number(log.logIndex)}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const getLogs = async (rpc, filter, fromBlock, toBlock) =>
  uniqueLogs(
    (await rpc.send("eth_getLogs", [{ ...filter, fromBlock: toHexBlock(fromBlock), toBlock: toHexBlock(toBlock) }])) ||
      []
  );

/**
 * Find the logs matching `filter` in [fromBlock, toBlock]. The whole range is tried in one request first. If the provider
 * refuses it because of its range or size limits, the range is scanned backwards (newest blocks first) in windows fetched
 * `concurrency` at a time, shrinking the windows while they are refused, and the scan stops at the newest window with
 * matching logs. Other errors are retried by the RPC layer and then thrown, never split. The accepted window size is
 * remembered on `rpc` for the next searches of the lookup.
 */
export const findLogs = async (rpc, filter, fromBlock, toBlock) => {
  if (toBlock < fromBlock) return [];
  let windowSize = rpc.windowSize || LOOKUP_LIMITS.windowSize;
  if (!rpc.windowSize || toBlock - fromBlock + 1 <= windowSize) {
    try {
      return await getLogs(rpc, filter, fromBlock, toBlock);
    } catch (err) {
      if (!isRangeLimitError(err) || toBlock === fromBlock) throw err;
    }
  }

  rpc.windowSize = windowSize;
  let high = toBlock;
  while (high >= fromBlock) {
    const windows = [];
    for (let end = high; end >= fromBlock && windows.length < LOOKUP_LIMITS.concurrency; end -= windowSize)
      windows.push({ from: Math.max(fromBlock, end - windowSize + 1), to: end });

    const results = await Promise.allSettled(windows.map((window) => getLogs(rpc, filter, window.from, window.to)));

    let refused = null;
    for (let i = 0; i < windows.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        if (!isRangeLimitError(result.reason)) throw result.reason;
        refused = windows[i];
        break;
      }
      if (result.value.length > 0) return result.value;
      high = windows[i].from - 1;
    }

    if (refused) {
      if (windowSize <= LOOKUP_LIMITS.minWindowSize || refused.from === refused.to)
        throw results[windows.indexOf(refused)].reason;
      windowSize = Math.max(LOOKUP_LIMITS.minWindowSize, Math.floor(windowSize / LOOKUP_LIMITS.windowShrinkFactor));
      high = refused.to;
      rpc.windowSize = windowSize;
    }
  }
  return [];
};

const requireSingleLog = (logs, what) => {
  if (logs.length !== 1) throw new Error(`Expected exactly one ${what} log, found ${logs.length}.`);
  return logs[0];
};

// ---------------------------------------------------------------------------------------------------------------------
// Lookup

const knownDisputeKey = (arbitratorChainId, entry, disputeId) => `${arbitratorChainId}:${entry.proxy}:${disputeId}`;

// Search window of the disputeID -> questionID event of a dispute missing from the known disputes map.
const unknownDisputeFromBlock = (arbitratorChainId, entry) =>
  Math.max(entry.proxyDeployBlock, (REGISTRY_SNAPSHOT_BLOCKS[arbitratorChainId] || 0) + 1);

// Returns { questionId, questionBlockUpperBound } for a dispute created after the known disputes snapshot.
const findQuestionId = async (entry, arbitratorRpc, arbitratorChainId, disputeId) => {
  const fromBlock = unknownDisputeFromBlock(arbitratorChainId, entry);

  if (entry.kind === "single-chain") {
    const filter = { address: entry.proxy, topics: [TOPICS.DisputeIDToQuestionID, toTopic(disputeId)] };
    const latest = await getBlockNumber(arbitratorRpc);
    const log = requireSingleLog(await findLogs(arbitratorRpc, filter, fromBlock, latest), "DisputeIDToQuestionID");
    return {
      questionId: abi.decodeParameter("bytes32", log.data),
      questionBlockUpperBound: utils.hexToNumber(log.blockNumber),
    };
  }

  const filter = { address: entry.proxy, topics: [TOPICS.ArbitrationCreated, null, null, toTopic(disputeId)] };
  let log;
  if (entry.hasArbitrationCreatedBlock) {
    try {
      const block = await callUint(arbitratorRpc, entry.proxy, ARBITRATION_CREATED_BLOCK_ABI, disputeId, {
        retries: 0,
      });
      if (block > 0) {
        const logs = await getLogs(arbitratorRpc, filter, block, block);
        if (logs.length === 1) log = logs[0];
      }
    } catch (err) {
      if (err.lookupLimit) throw err;
      // Fall back to the scan.
    }
  }
  if (!log) {
    const latest = await getBlockNumber(arbitratorRpc);
    log = requireSingleLog(await findLogs(arbitratorRpc, filter, fromBlock, latest), "ArbitrationCreated");
  }
  return { questionId: log.topics[1], questionBlockUpperBound: null, mappingBlock: utils.hexToNumber(log.blockNumber) };
};

const CLOCK_SKEW_MARGIN_S = 3600;
const MAX_BLOCK_SEARCH_STEPS = 8;

const getBlockHeader = async (rpc, block) => {
  const header = await rpc.send("eth_getBlockByNumber", [typeof block === "number" ? toHexBlock(block) : block, false]);
  if (!header) throw new Error(`Block ${block} not found.`);
  return { number: utils.hexToNumber(header.number), timestamp: utils.hexToNumber(header.timestamp) };
};

// Upper bound of the LogNewQuestion block of a cross-chain dispute: the question was created on the Reality.eth chain
// before the arbitration was created on the arbitrator chain (after a bridge round trip), so the first Reality.eth chain
// block at or after the ArbitrationCreated timestamp (plus a margin for clock skew) bounds it. Found by interpolation
// search in a few requests, any block at or after the timestamp being a valid (if looser) bound. Falls back to the
// Reality.eth chain head, which is always a valid bound.
const crossChainQuestionBlockUpperBound = async (arbitratorRpc, realityRpc, entry, mappingBlock) => {
  const latest = await getBlockNumber(realityRpc);
  try {
    const target = (await getBlockHeader(arbitratorRpc, mappingBlock)).timestamp + CLOCK_SKEW_MARGIN_S;
    let [low, high] = await Promise.all([
      getBlockHeader(realityRpc, entry.realityDeployBlock),
      getBlockHeader(realityRpc, latest),
    ]);
    if (high.timestamp <= target) return latest;
    if (low.timestamp >= target) return low.number;
    for (let step = 0; step < MAX_BLOCK_SEARCH_STEPS && high.number - low.number > 1; step++) {
      const ratio = (target - low.timestamp) / (high.timestamp - low.timestamp);
      const guess = Math.min(
        high.number - 1,
        Math.max(low.number + 1, Math.ceil(low.number + ratio * (high.number - low.number)))
      );
      const block = await getBlockHeader(realityRpc, guess);
      if (block.timestamp >= target) high = block;
      else low = block;
    }
    return high.number;
  } catch (err) {
    if (err.lookupLimit) throw err;
    return latest;
  }
};

const decodeQuestionLog = (log, questionId) => {
  if (!log.topics || String(log.topics[1]).toLowerCase() !== questionId.toLowerCase())
    throw new Error(`LogNewQuestion log does not match question ${questionId}.`);
  const decoded = abi.decodeParameters(
    ["uint256", "string", "address", "uint32", "uint32", "uint256", "uint256"],
    log.data
  );
  return { templateId: String(decoded[0]), questionText: decoded[1] };
};

const getTemplateText = async (realityRpc, entry, templateId) => {
  const block = await callUint(realityRpc, entry.reality, TEMPLATES_ABI, templateId);
  if (!block) throw new Error(`Template ${templateId} does not exist.`);
  const filter = { address: entry.reality, topics: [TOPICS.LogNewTemplate, toTopic(templateId)] };
  const log = requireSingleLog(await getLogs(realityRpc, filter, block, block), "LogNewTemplate");
  return abi.decodeParameter("string", log.data);
};

const lookupRealityQuestion = async (entry, arbitratorChainId, disputeId) => {
  const context = createLookupContext();
  const arbitratorRpc = createRpc(arbitratorChainId, context);
  const realityRpc =
    entry.realityChainId === arbitratorChainId ? arbitratorRpc : createRpc(entry.realityChainId, context);
  const questionFilter = (questionId) => ({ address: entry.reality, topics: [TOPICS.LogNewQuestion, questionId] });

  const known = KNOWN_DISPUTE_QUESTIONS[knownDisputeKey(arbitratorChainId, entry, disputeId)];
  let questionId;
  let question;
  let templateText;
  if (known) {
    // Question ID, question block and template ID are known: 3 requests, 2 round trips.
    questionId = known.questionId;
    const [questionLogs, text] = await Promise.all([
      getLogs(realityRpc, questionFilter(questionId), known.questionBlock, known.questionBlock),
      getTemplateText(realityRpc, entry, known.templateId),
    ]);
    question = decodeQuestionLog(requireSingleLog(questionLogs, "LogNewQuestion"), questionId);
    if (question.templateId !== String(known.templateId))
      throw new Error(`Question ${questionId} uses template ${question.templateId}, expected ${known.templateId}.`);
    templateText = text;
  } else {
    const found = await findQuestionId(entry, arbitratorRpc, arbitratorChainId, disputeId);
    questionId = found.questionId;
    const upperBound =
      found.questionBlockUpperBound !== null
        ? found.questionBlockUpperBound
        : await crossChainQuestionBlockUpperBound(arbitratorRpc, realityRpc, entry, found.mappingBlock);
    const questionLogs = await findLogs(realityRpc, questionFilter(questionId), entry.realityDeployBlock, upperBound);
    question = decodeQuestionLog(requireSingleLog(questionLogs, "LogNewQuestion"), questionId);
    templateText = await getTemplateText(realityRpc, entry, question.templateId);
  }

  return {
    questionId,
    templateId: question.templateId,
    templateText,
    questionText: question.questionText,
    reality: entry.reality,
    realityChainId: entry.realityChainId,
  };
};

// ---------------------------------------------------------------------------------------------------------------------
// Cache

const cacheKey = (arbitratorChainId, entry, disputeId) =>
  `${CACHE_PREFIX}/${arbitratorChainId}/${entry.proxy}/${disputeId}`;

const isValidCachedQuestion = (value, entry, known) =>
  Boolean(value) &&
  typeof value === "object" &&
  typeof value.questionId === "string" &&
  /^0x[0-9a-fA-F]{64}$/.test(value.questionId) &&
  (!known || value.questionId.toLowerCase() === known.questionId.toLowerCase()) &&
  typeof value.templateId === "string" &&
  /^\d+$/.test(value.templateId) &&
  typeof value.templateText === "string" &&
  typeof value.questionText === "string" &&
  value.reality === entry.reality &&
  value.realityChainId === entry.realityChainId;

const readCachedQuestion = (key, entry, known) => {
  try {
    const cached = window.localStorage.getItem(key);
    if (!cached) return undefined;
    const parsed = JSON.parse(cached);
    if (isValidCachedQuestion(parsed, entry, known)) return parsed;
  } catch {
    // Unparsable entry, removed below.
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable, so nothing to clean up.
  }
  return undefined;
};

const writeCachedQuestion = (key, question) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(question));
  } catch {
    // Caching is best-effort.
  }
};

const inFlightLookups = new Map();

/**
 * Fetch the Reality.eth question and template behind a Kleros dispute created by a known Reality.eth proxy.
 * @returns {Promise<{questionId, templateId, templateText, questionText, reality, realityChainId}|null>} null when the
 *   arbitrable is not a known Reality.eth proxy. Throws on RPC errors, exhausted request budget or deadline, or
 *   inconsistent data.
 */
export const fetchRealityQuestion = async ({ arbitratorChainId, arbitrable, disputeId }) => {
  const entry = getRealityProxy(arbitratorChainId, arbitrable);
  if (!entry) return null;

  const chainId = Number(arbitratorChainId);
  const id = String(disputeId);
  if (!/^\d+$/.test(id)) throw new Error(`Invalid dispute ID ${id}.`);

  const key = cacheKey(chainId, entry, id);
  const known = KNOWN_DISPUTE_QUESTIONS[knownDisputeKey(chainId, entry, id)];
  const cached = readCachedQuestion(key, entry, known);
  if (cached) return cached;

  if (!inFlightLookups.has(key)) {
    const lookup = lookupRealityQuestion(entry, chainId, id)
      .then((question) => {
        writeCachedQuestion(key, question);
        return question;
      })
      .finally(() => inFlightLookups.delete(key));
    inFlightLookups.set(key, lookup);
  }
  return inFlightLookups.get(key);
};
