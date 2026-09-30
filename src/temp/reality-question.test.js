import Web3 from "web3";
import { fetchRealityQuestion, findLogs, isRangeLimitError, LOOKUP_LIMITS } from "./reality-question";

jest.mock("../bootstrap/web3", () => ({ getReadOnlyRpcUrl: (chainId) => `https://rpc.test/${chainId}` }));

const SINGLE = "0x1111111111111111111111111111111111111111";
const CROSS = "0x2222222222222222222222222222222222222222";
const CROSS_WITH_BLOCK = "0x3333333333333333333333333333333333333333";
const REALITY_1 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const REALITY_100 = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

jest.mock("./reality-proxies", () => ({
  REALITY_PROXIES: {
    "1:0x1111111111111111111111111111111111111111": {
      proxy: "0x1111111111111111111111111111111111111111",
      kind: "single-chain",
      realityChainId: 1,
      reality: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      proxyDeployBlock: 1000,
      realityDeployBlock: 100,
      hasArbitrationCreatedBlock: false,
    },
    "1:0x2222222222222222222222222222222222222222": {
      proxy: "0x2222222222222222222222222222222222222222",
      kind: "cross-chain",
      realityChainId: 100,
      reality: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      proxyDeployBlock: 1000,
      realityDeployBlock: 100,
      hasArbitrationCreatedBlock: false,
    },
    "1:0x3333333333333333333333333333333333333333": {
      proxy: "0x3333333333333333333333333333333333333333",
      kind: "cross-chain",
      realityChainId: 100,
      reality: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      proxyDeployBlock: 1000,
      realityDeployBlock: 100,
      hasArbitrationCreatedBlock: true,
    },
  },
}));

const Q_KNOWN_SINGLE = `0x${"01".repeat(32)}`;
const Q_KNOWN_CROSS = `0x${"02".repeat(32)}`;
const Q_NEW_SINGLE = `0x${"03".repeat(32)}`;
const Q_NEW_CROSS = `0x${"04".repeat(32)}`;

jest.mock("./reality-known-questions", () => ({
  REGISTRY_SNAPSHOT_BLOCKS: { 1: 500000 },
  KNOWN_DISPUTE_QUESTIONS: {
    "1:0x1111111111111111111111111111111111111111:7": {
      questionId: `0x${"01".repeat(32)}`,
      questionBlock: 400000,
      templateId: 2,
    },
    "1:0x2222222222222222222222222222222222222222:8": {
      questionId: `0x${"02".repeat(32)}`,
      questionBlock: 700000,
      templateId: 3,
    },
  },
}));

const utils = Web3.utils;
const abi = new Web3().eth.abi;
const topic = (signature) => utils.sha3(signature);
const T = {
  map: topic("DisputeIDToQuestionID(uint256,bytes32)"),
  created: topic("ArbitrationCreated(bytes32,address,uint256)"),
  question: topic("LogNewQuestion(bytes32,address,uint256,string,bytes32,address,uint32,uint32,uint256,uint256)"),
  template: topic("LogNewTemplate(uint256,address,string)"),
};
const pad = (value) => utils.padLeft(utils.toHex(value), 64);
const TEMPLATE_SELECTOR = abi.encodeFunctionSignature("templates(uint256)");
const CREATED_BLOCK_SELECTOR = abi.encodeFunctionSignature("arbitrationCreatedBlock(uint256)");

let logCounter = 0;
const log = (address, blockNumber, topics, data) => ({
  address,
  blockNumber: utils.toHex(blockNumber),
  topics,
  data,
  transactionHash: pad(++logCounter),
  logIndex: "0x0",
});
const questionLog = (reality, block, questionId, templateId, text) =>
  log(
    reality,
    block,
    [T.question, questionId, pad(0)],
    abi.encodeParameters(
      ["uint256", "string", "address", "uint32", "uint32", "uint256", "uint256"],
      [templateId, text, SINGLE, 86400, 0, 0, 0]
    )
  );
const templateLog = (reality, block, templateId, text) =>
  log(reality, block, [T.template, pad(templateId), pad(0)], abi.encodeParameter("string", text));

// Block timestamps: 12 s blocks on chain 1, 5 s blocks on chain 100.
const BLOCK_TIMES = { 1: 12, 100: 5 };
const timestampOf = (chainId, block) => 1e9 + BLOCK_TIMES[chainId] * block;
// Dispute 10 is created at block 860000 of chain 1: its question lies at or before the first chain 100 block one hour
// (clock skew margin) after it.
const CROSS_BOUND = Math.ceil((timestampOf(1, 860000) + 3600 - 1e9) / 5);

// A fake chain per chain ID: logs, templates, arbitrationCreatedBlock values, a max eth_getLogs range and error hooks.
let chains;
let calls;
const resetChains = () => {
  calls = [];
  chains = {
    1: {
      latest: 900000,
      maxRange: Infinity,
      logs: [
        questionLog(REALITY_1, 400000, Q_KNOWN_SINGLE, 2, "known single"),
        templateLog(REALITY_1, 100, 2, "template 2 on 1"),
        log(SINGLE, 850000, [T.map, pad(9)], Q_NEW_SINGLE),
        questionLog(REALITY_1, 849990, Q_NEW_SINGLE, 2, "new single"),
        log(CROSS, 860000, [T.created, Q_NEW_CROSS, pad(0), pad(10)], "0x"),
        log(CROSS_WITH_BLOCK, 870000, [T.created, Q_NEW_CROSS, pad(0), pad(11)], "0x"),
      ],
      templates: { 2: 100 },
      createdBlocks: { 11: 870000 },
    },
    100: {
      latest: 3000000,
      maxRange: Infinity,
      logs: [
        questionLog(REALITY_100, 700000, Q_KNOWN_CROSS, 3, "known cross"),
        questionLog(REALITY_100, 1990000, Q_NEW_CROSS, 3, "new cross"),
        templateLog(REALITY_100, 150, 3, "template 3 on 100"),
      ],
      templates: { 3: 150 },
      createdBlocks: {},
    },
  };
};

const rpcError = (code, message) => ({ code, message });

const handle = (chainId, method, params) => {
  const chain = chains[chainId];
  if (chain.onRequest) {
    const override = chain.onRequest(method, params);
    if (override) return override;
  }
  if (method === "eth_blockNumber") return { result: utils.toHex(chain.latest) };
  if (method === "eth_getBlockByNumber") {
    const block = params[0] === "latest" ? chain.latest : utils.hexToNumber(params[0]);
    if (block > chain.latest) return { result: null };
    return { result: { number: utils.toHex(block), timestamp: utils.toHex(timestampOf(chainId, block)) } };
  }
  if (method === "eth_call") {
    const { to, data } = params[0];
    const arg = Number(abi.decodeParameter("uint256", `0x${data.slice(10)}`));
    if (data.startsWith(TEMPLATE_SELECTOR)) return { result: pad(chain.templates[arg] || 0) };
    if (data.startsWith(CREATED_BLOCK_SELECTOR) && to === CROSS_WITH_BLOCK)
      return { result: pad(chain.createdBlocks[arg] || 0) };
    return { error: rpcError(3, "execution reverted") };
  }
  if (method === "eth_getLogs") {
    const { address, topics, fromBlock, toBlock } = params[0];
    const from = utils.hexToNumber(fromBlock);
    const to = utils.hexToNumber(toBlock);
    if (to - from + 1 > chain.maxRange)
      return { error: rpcError(-32005, `query exceeds max block range ${chain.maxRange}`) };
    const result = chain.logs.filter((l) => {
      const block = utils.hexToNumber(l.blockNumber);
      return (
        l.address === address &&
        block >= from &&
        block <= to &&
        topics.every((t, i) => t === null || t === undefined || String(l.topics[i]).toLowerCase() === t.toLowerCase())
      );
    });
    return { result: chain.duplicateLogs ? [...result, ...result] : result };
  }
  throw new Error(`Unexpected method ${method}`);
};

const countCalls = (predicate = () => true) => calls.filter(predicate).length;
const getLogsCalls = (chainId) =>
  calls.filter((c) => c.method === "eth_getLogs" && (chainId === undefined || c.chainId === chainId));

beforeEach(() => {
  resetChains();
  window.localStorage.clear();
  Object.assign(LOOKUP_LIMITS, { retryDelaysMs: [1, 1], requestBudget: 1500, deadlineMs: 90000 });
  jest.spyOn(Web3.providers, "HttpProvider").mockImplementation((url, options) => {
    const chainId = Number(url.split("/").pop());
    return {
      options,
      send: (payload, callback) => {
        calls.push({ chainId, method: payload.method, params: payload.params });
        setTimeout(() => {
          try {
            const { result, error } = handle(chainId, payload.method, payload.params);
            callback(
              null,
              error ? { jsonrpc: "2.0", id: payload.id, error } : { jsonrpc: "2.0", id: payload.id, result }
            );
          } catch (err) {
            callback(err);
          }
        }, 0);
      },
    };
  });
});

afterEach(() => jest.restoreAllMocks());

describe("fetchRealityQuestion", () => {
  it("returns null for arbitrables that are not known Reality.eth proxies", async () => {
    expect(
      await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: CROSS.replace("2", "9"), disputeId: 1 })
    ).toBe(null);
    expect(calls).toHaveLength(0);
  });

  it("looks up a known single-chain dispute with single-block requests only", async () => {
    const question = await fetchRealityQuestion({
      arbitratorChainId: 1,
      arbitrable: SINGLE.toUpperCase(),
      disputeId: 7,
    });
    expect(question).toEqual({
      questionId: Q_KNOWN_SINGLE,
      templateId: "2",
      templateText: "template 2 on 1",
      questionText: "known single",
      reality: REALITY_1,
      realityChainId: 1,
    });
    expect(calls).toHaveLength(3);
    expect(countCalls((c) => c.method === "eth_blockNumber")).toBe(0);
    getLogsCalls().forEach(({ params: [filter] }) => expect(filter.fromBlock).toBe(filter.toBlock));
    expect(Web3.providers.HttpProvider).toHaveBeenCalledWith("https://rpc.test/1", { timeout: 20000 });
  });

  it("looks up a known cross-chain dispute on the Reality.eth chain only", async () => {
    const question = await fetchRealityQuestion({ arbitratorChainId: "1", arbitrable: CROSS, disputeId: "8" });
    expect(question).toMatchObject({
      questionId: Q_KNOWN_CROSS,
      templateId: "3",
      templateText: "template 3 on 100",
      questionText: "known cross",
      realityChainId: 100,
    });
    expect(calls).toHaveLength(3);
    expect(countCalls((c) => c.chainId !== 100)).toBe(0);
  });

  it("rejects a known question whose log does not use the expected template", async () => {
    chains[1].logs[0] = questionLog(REALITY_1, 400000, Q_KNOWN_SINGLE, 5, "known single");
    await expect(fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 7 })).rejects.toThrow(
      /template 5, expected 2/
    );
  });

  it("searches an unknown single-chain dispute after the snapshot, in windows when the range is refused", async () => {
    chains[1].maxRange = 10000;
    const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 9 });
    expect(question).toMatchObject({ questionId: Q_NEW_SINGLE, templateId: "2", questionText: "new single" });

    const [mappingWhole, ...rest] = getLogsCalls();
    expect(mappingWhole.params[0]).toMatchObject({ fromBlock: utils.toHex(500001), toBlock: utils.toHex(900000) });
    // The mapping search stops at the batch holding the log: [890001, 900000] ... [820001, 830000].
    const mappingWindows = rest.filter((c) => c.params[0].topics[0] === T.map);
    expect(mappingWindows).toHaveLength(8);
    expect(mappingWindows[0].params[0]).toMatchObject({ fromBlock: utils.toHex(890001), toBlock: utils.toHex(900000) });
    // The question search starts from the mapping event's block, not from the chain head, and goes straight to the
    // windows since this provider already refused a larger range.
    const questionCalls = rest.filter((c) => c.params[0].topics[0] === T.question);
    expect(questionCalls[0].params[0]).toMatchObject({ fromBlock: utils.toHex(840001), toBlock: utils.toHex(850000) });
  });

  it("tries the whole range first on a provider that has not refused a range yet", async () => {
    chains[100].maxRange = 100000;
    await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: CROSS, disputeId: 10 });
    const questionCalls = getLogsCalls(100).filter((c) => c.params[0].topics[0] === T.question);
    expect(questionCalls[0].params[0]).toMatchObject({
      fromBlock: utils.toHex(100),
      toBlock: utils.toHex(CROSS_BOUND),
    });
    expect(questionCalls[1].params[0]).toMatchObject({
      fromBlock: utils.toHex(CROSS_BOUND - 9999),
      toBlock: utils.toHex(CROSS_BOUND),
    });
  });

  it("shrinks the windows while the provider still refuses them", async () => {
    chains[1].maxRange = 500;
    const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 9 });
    expect(question.questionId).toBe(Q_NEW_SINGLE);
    const sizes = getLogsCalls().map(
      ({ params: [f] }) => utils.hexToNumber(f.toBlock) - utils.hexToNumber(f.fromBlock) + 1
    );
    expect(sizes).toEqual(expect.arrayContaining([10000, 2000, 400]));
    expect(Math.max(...sizes.slice(sizes.indexOf(400)))).toBeLessThanOrEqual(400);
  });

  it("throws when the provider refuses even the smallest window", async () => {
    chains[1].maxRange = 50;
    await expect(fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 9 })).rejects.toThrow(
      /max block range/
    );
  });

  it("retries other errors a couple of times and throws them without splitting the range", async () => {
    chains[1].onRequest = (method) =>
      method === "eth_getLogs" ? { error: rpcError(-32000, "internal server error") } : undefined;
    await expect(fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 9 })).rejects.toThrow(
      "internal server error"
    );
    const logCalls = getLogsCalls();
    expect(logCalls).toHaveLength(3);
    logCalls.forEach((c) => expect(c.params[0]).toMatchObject({ fromBlock: utils.toHex(500001) }));
  });

  it("does not mistake rate limiting for a range limit", async () => {
    let limited = 2;
    chains[1].onRequest = (method) =>
      method === "eth_getLogs" && limited-- > 0 ? { error: rpcError(-32005, "rate limit exceeded") } : undefined;
    const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 9 });
    expect(question.questionId).toBe(Q_NEW_SINGLE);
    // 2 rate-limited + mapping + question (both over their whole range) + template.
    expect(getLogsCalls()).toHaveLength(5);
  });

  it("throws once the request budget is exhausted", async () => {
    chains[1].maxRange = 100;
    chains[1].logs = chains[1].logs.filter((l) => l.topics[0] !== T.map);
    LOOKUP_LIMITS.requestBudget = 40;
    await expect(fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 9 })).rejects.toThrow(
      /budget of 40 requests/
    );
    expect(calls.length).toBeLessThanOrEqual(40);
  });

  it("throws once the deadline is exceeded", async () => {
    chains[1].maxRange = 100;
    LOOKUP_LIMITS.deadlineMs = -1;
    await expect(fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 9 })).rejects.toThrow(
      /deadline/
    );
    expect(calls).toHaveLength(0);
  });

  it("searches the question of an unknown cross-chain dispute back from the arbitration creation time", async () => {
    chains[100].maxRange = 100000;
    const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: CROSS, disputeId: 10 });
    expect(question).toMatchObject({ questionId: Q_NEW_CROSS, templateText: "template 3 on 100", realityChainId: 100 });
    const questionCalls = getLogsCalls(100).filter((c) => c.params[0].topics[0] === T.question);
    expect(questionCalls[questionCalls.length - 1].params[0]).toMatchObject({
      toBlock: utils.toHex(CROSS_BOUND - 7 * 10000),
    });
    expect(questionCalls).toHaveLength(9); // The whole range, then a batch of 8 windows.
    expect(countCalls((c) => c.method === "eth_getBlockByNumber")).toBeLessThanOrEqual(3 + 8);
  });

  it("searches the question of an unknown cross-chain dispute back from the Reality.eth chain head as a fallback", async () => {
    chains[1].onRequest = (method) =>
      method === "eth_getBlockByNumber" ? { error: rpcError(-32000, "header not found") } : undefined;
    const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: CROSS, disputeId: 10 });
    expect(question.questionId).toBe(Q_NEW_CROSS);
    const [questionCall] = getLogsCalls(100).filter((c) => c.params[0].topics[0] === T.question);
    expect(questionCall.params[0]).toMatchObject({ fromBlock: utils.toHex(100), toBlock: utils.toHex(3000000) });
  });

  it("uses arbitrationCreatedBlock when the proxy has it", async () => {
    const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: CROSS_WITH_BLOCK, disputeId: 11 });
    expect(question.questionId).toBe(Q_NEW_CROSS);
    const [mapping] = getLogsCalls(1);
    expect(getLogsCalls(1)).toHaveLength(1);
    expect(mapping.params[0]).toMatchObject({ fromBlock: utils.toHex(870000), toBlock: utils.toHex(870000) });
  });

  it("falls back to the scan when arbitrationCreatedBlock fails", async () => {
    chains[1].onRequest = (method) =>
      method === "eth_call" ? { error: rpcError(-32000, "header not found") } : undefined;
    const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: CROSS_WITH_BLOCK, disputeId: 11 });
    expect(question.questionId).toBe(Q_NEW_CROSS);
    expect(countCalls((c) => c.chainId === 1 && c.method === "eth_call")).toBe(1); // Not retried.
    expect(getLogsCalls(1)[0].params[0]).toMatchObject({ fromBlock: utils.toHex(500001) });
  });

  it("falls back to the scan when the arbitrationCreatedBlock getLogs fails", async () => {
    chains[1].onRequest = (method, [filter]) =>
      method === "eth_getLogs" && filter.fromBlock === filter.toBlock
        ? { error: rpcError(-32000, "unknown block") }
        : undefined;
    const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: CROSS_WITH_BLOCK, disputeId: 11 });
    expect(question.questionId).toBe(Q_NEW_CROSS);
  });

  it("deduplicates logs returned twice", async () => {
    chains[1].duplicateLogs = true;
    const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 9 });
    expect(question.questionId).toBe(Q_NEW_SINGLE);
  });

  it("rejects distinct duplicate mapping logs", async () => {
    chains[1].logs.push(log(SINGLE, 860000, [T.map, pad(9)], `0x${"05".repeat(32)}`));
    await expect(fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 9 })).rejects.toThrow(
      "Expected exactly one DisputeIDToQuestionID log, found 2."
    );
  });

  it("rejects an unknown dispute without mapping log", async () => {
    await expect(fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 12 })).rejects.toThrow(
      "found 0"
    );
  });

  describe("cache", () => {
    const KEY = `@@kleros/court/reality-question/v1/1/${SINGLE}/7`;

    it("caches results and serves them without requests", async () => {
      const first = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 7 });
      expect(JSON.parse(window.localStorage.getItem(KEY))).toEqual(first);
      calls = [];
      const second = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 7 });
      expect(second).toEqual(first);
      expect(calls).toHaveLength(0);
    });

    it.each([
      ["unparsable", "{"],
      ["missing fields", JSON.stringify({ questionId: Q_KNOWN_SINGLE })],
      [
        "another question than the known one",
        JSON.stringify({
          questionId: Q_NEW_SINGLE,
          templateId: "2",
          templateText: "t",
          questionText: "q",
          reality: REALITY_1,
          realityChainId: 1,
        }),
      ],
      [
        "another Reality.eth contract",
        JSON.stringify({
          questionId: Q_KNOWN_SINGLE,
          templateId: "2",
          templateText: "t",
          questionText: "q",
          reality: REALITY_100,
          realityChainId: 1,
        }),
      ],
    ])("drops invalid entries (%s) and fetches again", async (_name, value) => {
      window.localStorage.setItem(KEY, value);
      const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 7 });
      expect(question.questionText).toBe("known single");
      expect(calls).toHaveLength(3);
      expect(JSON.parse(window.localStorage.getItem(KEY))).toEqual(question);
    });

    it("does not cache failures", async () => {
      chains[1].onRequest = () => ({ error: rpcError(-32000, "down") });
      await expect(fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 7 })).rejects.toThrow();
      expect(window.localStorage.getItem(KEY)).toBe(null);
    });

    it("works when storage is unavailable", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("denied");
      });
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("denied");
      });
      const question = await fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 7 });
      expect(question.questionId).toBe(Q_KNOWN_SINGLE);
    });
  });

  it("shares concurrent lookups of the same dispute", async () => {
    const [a, b, c] = await Promise.all([
      fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: SINGLE, disputeId: 7 }),
      fetchRealityQuestion({ arbitratorChainId: "1", arbitrable: SINGLE.toUpperCase(), disputeId: "7" }),
      fetchRealityQuestion({ arbitratorChainId: 1, arbitrable: CROSS, disputeId: 8 }),
    ]);
    expect(a).toBe(b);
    expect(c.questionId).toBe(Q_KNOWN_CROSS);
    expect(calls).toHaveLength(6);
  });
});

describe("isRangeLimitError", () => {
  it.each([
    [{ code: -32005, message: "query returned more than 10000 results" }, true],
    [{ code: -32602, message: "Log response size exceeded." }, true],
    [{ message: "Returned error: block range is too wide" }, true],
    [{ message: "eth_getLogs is limited to a 1000 range" }, true],
    [{ message: 'Invalid JSON RPC response: "413 Request Entity Too Large"' }, true],
    [{ message: "CONNECTION TIMEOUT: timeout of 20000 ms achived" }, true],
    [{ code: -32005, message: "daily request count exceeded, request rate limited" }, false],
    [{ code: 429, message: "Too Many Requests" }, false],
    [{ code: -32000, message: "header not found" }, false],
    [{ message: "Reality question lookup exceeded its budget of 1500 requests.", lookupLimit: true }, false],
  ])("%j -> %s", (err, expected) => expect(isRangeLimitError(err)).toBe(expected));
});

describe("findLogs", () => {
  it("returns no logs for an empty range without requests", async () => {
    const rpc = { send: jest.fn() };
    expect(await findLogs(rpc, {}, 10, 9)).toEqual([]);
    expect(rpc.send).not.toHaveBeenCalled();
  });
});
