#!/usr/bin/env node
/**
 * Generates src/temp/reality-known-questions.js: the Reality.eth question of every dispute created so far by the
 * Reality.eth arbitrables of src/temp/reality-proxies.js, so that src/temp/reality-question.js can fetch these
 * questions with single-block eth_getLogs calls instead of scanning. Disputes created after the snapshot block are
 * still found by scanning from that block, which gets slower as the snapshot ages: regenerate it periodically, and
 * whenever an arbitrable is added to REALITY_PROXIES.
 *
 * For each arbitrable, it collects every disputeID -> questionID event (DisputeIDToQuestionID for single-chain
 * proxies, ArbitrationCreated for cross-chain foreign proxies) up to the latest finalized block of its arbitrator chain,
 * then finds the LogNewQuestion event of each question on the arbitrable's Reality.eth contract. Read-only RPC calls.
 *
 * RPC endpoints are read from the same environment variables as the app (src/bootstrap/web3.js), also from .env.
 *
 * By default the update is incremental: disputes already in the file are re-verified with single-block queries, and
 * disputeID -> questionID events are only scanned after the previous snapshot block (from the deployment block for
 * arbitrables without known disputes, e.g. newly added ones).
 *
 * Usage (see REALITY_OPS.md):
 *   node scripts/generate-reality-known-questions.js          incremental update to the latest finalized blocks
 *   node scripts/generate-reality-known-questions.js --full   rescan everything from the deployment blocks
 *   node scripts/generate-reality-known-questions.js --check  recompute at the current snapshot blocks, without writing,
 *                                                             and exit with an error if the file differs
 */
/* global BigInt */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const axios = require("axios");
const prettier = require("prettier");
const { sha3 } = require("web3").utils;

const root = path.join(__dirname, "..");
const proxiesFile = path.join(root, "src", "temp", "reality-proxies.js");
const outputFile = path.join(root, "src", "temp", "reality-known-questions.js");

try {
  require("dotenv").config({ path: path.join(root, ".env") });
} catch {
  // dotenv is optional: the environment variables can be set directly.
}

const RPC_ENV_VARS = {
  1: "REACT_APP_WEB3_FALLBACK_HTTPS_URL",
  100: "REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL",
  130: "REACT_APP_WEB3_FALLBACK_UNICHAIN_HTTPS_URL",
  137: "REACT_APP_WEB3_FALLBACK_POLYGON_HTTPS_URL",
  8453: "REACT_APP_WEB3_FALLBACK_BASE_HTTPS_URL",
};

const TOPICS = {
  DisputeIDToQuestionID: sha3("DisputeIDToQuestionID(uint256,bytes32)"),
  ArbitrationCreated: sha3("ArbitrationCreated(bytes32,address,uint256)"),
  LogNewQuestion: sha3("LogNewQuestion(bytes32,address,uint256,string,bytes32,address,uint32,uint32,uint256,uint256)"),
};

const WINDOW = 10000;
const MIN_WINDOW = 100;
const CONCURRENCY = 8;

// src/temp/reality-proxies.js is an ES module: evaluate its single `export const` declaration.
const loadRealityProxies = () => {
  const source = fs.readFileSync(proxiesFile, "utf8");
  if ((source.match(/^export /gm) || []).length !== 1 || !source.includes("export const REALITY_PROXIES ="))
    throw new Error("Unexpected format of src/temp/reality-proxies.js");
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(source.replace("export const REALITY_PROXIES =", "module.exports ="), sandbox);
  return sandbox.module.exports;
};

// The current src/temp/reality-known-questions.js, an ES module with two `export const` declarations.
const loadKnownQuestions = () => {
  if (!fs.existsSync(outputFile)) return { REGISTRY_SNAPSHOT_BLOCKS: {}, KNOWN_DISPUTE_QUESTIONS: {} };
  const source = fs.readFileSync(outputFile, "utf8").replace(/^export const (\w+) =/gm, "exports.$1 =");
  const sandbox = { exports: {} };
  vm.runInNewContext(source, sandbox);
  return sandbox.exports;
};

let requestId = 0;
const rpc = async (chainId, method, params) => {
  const url = process.env[RPC_ENV_VARS[chainId]];
  if (!url) throw new Error(`Missing ${RPC_ENV_VARS[chainId]} for chain ${chainId}`);
  for (let attempt = 0; ; attempt++) {
    try {
      const { data } = await axios.post(url, { jsonrpc: "2.0", id: ++requestId, method, params }, { timeout: 30000 });
      if (data.error) throw Object.assign(new Error(data.error.message), { code: data.error.code, rpc: true });
      return data.result;
    } catch (err) {
      // Some providers answer refused requests (e.g. eth_getLogs ranges above their limit) with an HTTP 4xx status.
      const status = err.response?.status;
      if (status >= 400 && status < 500 && status !== 429) {
        const message = err.response.data?.error?.message ?? `HTTP ${status}`;
        throw Object.assign(new Error(message), { code: err.response.data?.error?.code, rpc: true });
      }
      if (err.rpc || attempt >= 3) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
};

const getLogsOnce = (chainId, filter, fromBlock, toBlock) =>
  rpc(chainId, "eth_getLogs", [
    { ...filter, fromBlock: `0x${fromBlock.toString(16)}`, toBlock: `0x${toBlock.toString(16)}` },
  ]);

// All logs in [fromBlock, toBlock]: one request, or windows when the node refuses the whole range.
const getLogs = async (chainId, filter, fromBlock, toBlock) => {
  try {
    return await getLogsOnce(chainId, filter, fromBlock, toBlock);
  } catch (err) {
    if (!err.rpc) throw err;
  }
  for (let window = WINDOW; window >= MIN_WINDOW; window = Math.floor(window / 5)) {
    const ranges = [];
    for (let from = fromBlock; from <= toBlock; from += window)
      ranges.push([from, Math.min(from + window - 1, toBlock)]);
    try {
      const logs = [];
      for (let i = 0; i < ranges.length; i += CONCURRENCY) {
        const batch = await Promise.all(
          ranges.slice(i, i + CONCURRENCY).map(([from, to]) => getLogsOnce(chainId, filter, from, to))
        );
        logs.push(...batch.flat());
      }
      return logs;
    } catch (err) {
      if (!err.rpc) throw err;
    }
  }
  throw new Error(`eth_getLogs refused on chain ${chainId} even with ${MIN_WINDOW}-block windows`);
};

const uniqueLogs = (logs) =>
  logs.filter(
    (log, i) =>
      !log.removed &&
      logs.findIndex((other) => other.transactionHash === log.transactionHash && other.logIndex === log.logIndex) === i
  );

// The single log matching the filter in [fromBlock, toBlock]: one request, or windows scanned backwards from toBlock
// (the most recent first) when the node refuses the whole range.
const findLog = async (chainId, filter, fromBlock, toBlock, what) => {
  let logs;
  try {
    logs = uniqueLogs(await getLogsOnce(chainId, filter, fromBlock, toBlock));
  } catch (err) {
    if (!err.rpc) throw err;
  }
  for (let window = WINDOW; !logs && window >= MIN_WINDOW; window = Math.floor(window / 5)) {
    try {
      for (let to = toBlock; to >= fromBlock && !logs?.length; to -= window * CONCURRENCY) {
        const ranges = [];
        for (let i = 0; i < CONCURRENCY && to - i * window >= fromBlock; i++)
          ranges.push([Math.max(to - (i + 1) * window + 1, fromBlock), to - i * window]);
        const batch = await Promise.all(ranges.map(([from, end]) => getLogsOnce(chainId, filter, from, end)));
        const found = uniqueLogs(batch.flat());
        if (found.length) logs = found;
        else logs = to - window * CONCURRENCY < fromBlock ? [] : undefined;
      }
    } catch (err) {
      if (!err.rpc) throw err;
      logs = undefined;
    }
  }
  if (!logs) throw new Error(`eth_getLogs refused on chain ${chainId} even with ${MIN_WINDOW}-block windows`);
  if (logs.length !== 1) throw new Error(`Expected one ${what}, found ${logs.length}`);
  return logs[0];
};

const finalizedBlock = async (chainId) =>
  parseInt((await rpc(chainId, "eth_getBlockByNumber", ["finalized", false])).number, 16);

const collectDisputes = async (key, entry, fromBlock, snapshotBlock) => {
  const [chainId] = key.split(":");
  const singleChain = entry.kind === "single-chain";
  const topic = singleChain ? TOPICS.DisputeIDToQuestionID : TOPICS.ArbitrationCreated;
  const logs = uniqueLogs(
    await getLogs(Number(chainId), { address: entry.proxy, topics: [topic] }, fromBlock, snapshotBlock)
  );
  const disputes = {};
  for (const log of logs) {
    const disputeId = BigInt(singleChain ? log.topics[1] : log.topics[3]).toString();
    const questionId = (singleChain ? log.data.slice(0, 66) : log.topics[1]).toLowerCase();
    if (disputes[disputeId]) throw new Error(`${key}: dispute ${disputeId} mapped twice`);
    disputes[disputeId] = { questionId, mappingBlock: parseInt(log.blockNumber, 16) };
  }
  return disputes;
};

const questionFromLog = (questionId, log) => {
  if (log.topics[1].toLowerCase() !== questionId) throw new Error(`Unexpected LogNewQuestion for ${questionId}`);
  return {
    questionId,
    questionBlock: parseInt(log.blockNumber, 16),
    templateId: Number(BigInt(log.data.slice(0, 66))),
  };
};

const questionFilter = (entry, questionId) => ({
  address: entry.reality,
  topics: [TOPICS.LogNewQuestion, questionId],
});

const findQuestion = async (key, entry, { questionId, mappingBlock }) => {
  const sameChain = entry.realityChainId === Number(key.split(":")[0]);
  const toBlock = sameChain ? mappingBlock : await finalizedBlock(entry.realityChainId);
  const log = await findLog(
    entry.realityChainId,
    questionFilter(entry, questionId),
    entry.realityDeployBlock,
    toBlock,
    `LogNewQuestion for ${questionId} (${key})`
  );
  return questionFromLog(questionId, log);
};

// Re-verify a known question with a single-block query.
const verifyQuestion = async (key, entry, known) => {
  const logs = uniqueLogs(
    await getLogsOnce(
      entry.realityChainId,
      questionFilter(entry, known.questionId),
      known.questionBlock,
      known.questionBlock
    )
  );
  if (logs.length !== 1) throw new Error(`${key}: LogNewQuestion of ${known.questionId} not at ${known.questionBlock}`);
  const question = questionFromLog(known.questionId, logs[0]);
  if (question.templateId !== known.templateId) throw new Error(`${key}: template of ${known.questionId} changed`);
  return question;
};

const render = async (snapshotBlocks, known) => {
  const sortKey = (key) => key.split(":").map((part, i) => (i === 1 ? part : Number(part)));
  const keys = Object.keys(known).sort((a, b) => {
    const [ka, kb] = [sortKey(a), sortKey(b)];
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
    return 0;
  });
  const source = `// Generated by scripts/generate-reality-known-questions.js: do not edit by hand.
//
// Reality.eth questions of the disputes created by the Reality.eth proxies of REALITY_PROXIES, keyed by
// "<arbitrator chain ID>:<lowercase proxy>:<dispute ID>". Lets fetchRealityQuestion skip the eth_getLogs scans of the
// disputeID -> questionID event and of the LogNewQuestion event for these disputes.
//
// The map is complete up to REGISTRY_SNAPSHOT_BLOCKS[arbitratorChainId] (a finalized block at generation time):
// disputes missing from it are only searched after that block. Regenerate this file whenever a proxy is added to
// REALITY_PROXIES.

// Arbitrator chain ID => last block covered by KNOWN_DISPUTE_QUESTIONS.
export const REGISTRY_SNAPSHOT_BLOCKS = ${JSON.stringify(snapshotBlocks)};

export const KNOWN_DISPUTE_QUESTIONS = {
${keys
  .map(
    (key) =>
      `  "${key}": { questionId: "${known[key].questionId}", questionBlock: ${known[key].questionBlock}, templateId: ${known[key].templateId} },`
  )
  .join("\n")}
};
`;
  const options = (await prettier.resolveConfig(outputFile)) || {};
  return prettier.format(source, { ...options, filepath: outputFile });
};

const main = async () => {
  const check = process.argv.includes("--check");
  const full = process.argv.includes("--full");
  const proxies = loadRealityProxies();
  const previous = loadKnownQuestions();
  const chainIds = [...new Set(Object.keys(proxies).map((key) => Number(key.split(":")[0])))];

  const snapshotBlocks = check
    ? previous.REGISTRY_SNAPSHOT_BLOCKS
    : Object.fromEntries(await Promise.all(chainIds.map(async (chainId) => [chainId, await finalizedBlock(chainId)])));

  const known = {};
  for (const [key, entry] of Object.entries(proxies)) {
    const chainId = key.split(":")[0];
    const snapshotBlock = snapshotBlocks[chainId];
    if (!snapshotBlock) throw new Error(`No snapshot block for chain ${chainId}`);

    const previousDisputes = Object.entries(previous.KNOWN_DISPUTE_QUESTIONS)
      .filter(([knownKey]) => knownKey.startsWith(`${key}:`))
      .map(([knownKey, question]) => [knownKey.split(":")[2], question]);
    const previousSnapshot = previous.REGISTRY_SNAPSHOT_BLOCKS[chainId];
    const incremental = !full && !check && previousDisputes.length > 0 && previousSnapshot;

    const disputes = await collectDisputes(
      key,
      entry,
      incremental ? Math.max(previousSnapshot + 1, entry.proxyDeployBlock) : entry.proxyDeployBlock,
      snapshotBlock
    );
    if (incremental)
      for (const [disputeId, question] of previousDisputes) {
        if (disputes[disputeId]) throw new Error(`${key}: dispute ${disputeId} mapped twice`);
        known[`${key}:${disputeId}`] = await verifyQuestion(key, entry, question);
      }
    for (const [disputeId, mapping] of Object.entries(disputes)) {
      const previousQuestion = previous.KNOWN_DISPUTE_QUESTIONS[`${key}:${disputeId}`];
      known[`${key}:${disputeId}`] =
        previousQuestion && previousQuestion.questionId === mapping.questionId
          ? await verifyQuestion(key, entry, previousQuestion)
          : await findQuestion(key, entry, mapping);
    }
    console.info(`${key}: ${Object.keys(known).filter((k) => k.startsWith(`${key}:`)).length} dispute(s)`);
  }

  const output = await render(snapshotBlocks, known);
  if (check) {
    if (fs.readFileSync(outputFile, "utf8") !== output) {
      console.error("src/temp/reality-known-questions.js does not match the chain data at its snapshot blocks.");
      process.exit(1);
    }
    console.info(`src/temp/reality-known-questions.js is up to date (${Object.keys(known).length} disputes).`);
  } else {
    fs.writeFileSync(outputFile, output);
    console.info(`Wrote ${Object.keys(known).length} disputes at snapshot blocks ${JSON.stringify(snapshotBlocks)}.`);
  }
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
