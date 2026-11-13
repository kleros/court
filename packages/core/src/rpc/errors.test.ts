import {
  encodeAbiParameters,
  encodeErrorResult,
  encodeFunctionResult,
  multicall3Abi,
  parseAbi,
  TimeoutError,
} from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestBudget } from "./budget.ts";
import { createReadClient, withBudget } from "./client.ts";
import { describeError, isContractRevert, isRangeLimitError, toReadFailure } from "./errors.ts";
import { customClient, fakeRpc, rpcError, type RpcAnswer } from "./fakeRpc.ts";

// A planted marker standing in for a provider key. Low-entropy on purpose: a random-looking value here is what CI's
// secret scan (gitleaks, generic-api-key) reports as a leaked key.
const KEY = "fake-key-0000000000";
const URL_WITH_KEY = `https://eth-mainnet.example-provider.org/v2/${KEY}?token=${KEY}t`;
const ABI = parseAbi(["function disputes(uint256) view returns (uint256)"]);
const CONTRACT = "0x988b3a538b618c7a603e1c11ab82cd16dbe28069";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** The error `run` ends with on a read client (viem's real http path) whose endpoint always gives `answer`. */
async function failure(answer: RpcAnswer, run: (client: ReturnType<typeof createReadClient>) => Promise<unknown>) {
  const { fetchFn } = fakeRpc(() => answer);
  const settled = run(createReadClient(URL_WITH_KEY, 1, { timeoutMs: 50, fetchFn })).then(
    () => {
      throw new Error("expected the request to fail");
    },
    (error: unknown) => error,
  );
  await vi.runAllTimersAsync();
  return settled;
}

function failedRequest(answer: RpcAnswer, method: "eth_getLogs" | "eth_blockNumber" = "eth_getLogs") {
  return failure(answer, (client) =>
    method === "eth_getLogs"
      ? client.getLogs({ fromBlock: 0n, toBlock: 10n })
      : client.getBlockNumber({ cacheTime: 0 }),
  );
}

/** The error readContract gives when the node answers eth_call with `answer`. */
function failedRead(answer: RpcAnswer) {
  return failure(answer, (client) =>
    client.readContract({ address: CONTRACT, abi: ABI, functionName: "disputes", args: [5000n] }),
  );
}

const revertData = encodeErrorResult({
  abi: parseAbi(["error Error(string)"]),
  errorName: "Error",
  args: ["Dispute does not exist."],
});

describe("isRangeLimitError", () => {
  it.each<[string, RpcAnswer]>([
    [
      "-32005 result cap (Infura wording)",
      { error: { code: -32005, message: "query returned more than 10000 results" } },
    ],
    ["-32602 response size (Alchemy wording)", { error: { code: -32602, message: "Log response size exceeded." } }],
    ["-32600 refused request", { error: { code: -32600, message: "invalid request" } }],
    ["HTTP 413", { status: 413, body: "Payload Too Large" }],
    ["block range wording", { error: { code: -32000, message: "block range is too wide" } }],
    ["a timeout", "hang"],
  ])("%s is a range refusal", async (_name, answer) => {
    expect(isRangeLimitError(await failedRequest(answer))).toBe(true);
  });

  it.each<[string, RpcAnswer]>([
    [
      "-32005 rate limit (Infura wording)",
      { error: { code: -32005, message: "daily request count exceeded, request rate limited" } },
    ],
    ["HTTP 429", { status: 429, body: "Too Many Requests" }],
    ["HTTP 429 with range words in the body", { status: 429, body: "limit exceeded" }],
    ["HTTP 503", { status: 503, body: "Service Unavailable" }],
    ["-32000 header not found", { error: { code: -32000, message: "header not found" } }],
    ["a failed connection", { throws: new TypeError("fetch failed") }],
  ])("%s is not a range refusal", async (_name, answer) => {
    expect(isRangeLimitError(await failedRequest(answer))).toBe(false);
  });

  // The rows above carry range words too; these carry none, so only the code can make them a refusal.
  it.each([-32005, -32602, -32600, -32614, 413])("code %i counts by itself, with no range words", (code) => {
    expect(isRangeLimitError(rpcError(code, "x"))).toBe(true);
  });

  it.each<[string, RpcAnswer]>([
    ["-32602", { error: { code: -32602, message: "x" } }],
    ["-32614", { error: { code: -32614, message: "x" } }],
    ["413 as a JSON-RPC code", { error: { code: 413, message: "x" } }],
    ["HTTP 413", { status: 413, body: "x" }],
  ])("%s with no range words is a range refusal through the read client", async (_name, answer) => {
    expect(isRangeLimitError(await failedRequest(answer))).toBe(true);
  });

  it("another code with no range words is not a range refusal", async () => {
    expect(isRangeLimitError(rpcError(-32000, "x"))).toBe(false);
    expect(isRangeLimitError(await failedRequest({ error: { code: -32000, message: "x" } }))).toBe(false);
  });

  it("a spent budget is never a range refusal (splitting would only spend more)", async () => {
    const budget = createRequestBudget({ maxRequests: 0, deadlineMs: 1_000 });
    const client = withBudget(
      customClient(() => Promise.resolve([])),
      budget,
    );
    const error = await client.getLogs({ fromBlock: 0n, toBlock: 10n }).catch((e: unknown) => e);
    expect(toReadFailure(error, "logs").message).toContain("budget");
    expect(isRangeLimitError(error)).toBe(false);
  });
});

describe("isContractRevert", () => {
  it.each<[string, RpcAnswer]>([
    ["code 3 execution reverted, no data (Gnosis form)", { error: { code: 3, message: "execution reverted" } }],
    ["code 3 with Error(string) revert data", { error: { code: 3, message: "execution reverted", data: revertData } }],
    ["-32603 carrying revert data", { error: { code: -32603, message: "Internal error", data: revertData } }],
    ["-32000 invalid opcode", { error: { code: -32000, message: "invalid opcode: INVALID" } }],
    ["-32003 InvalidFEOpcode", { error: { code: -32003, message: "EVM error: InvalidFEOpcode" } }],
    ["-32603 naming an EVM halt", { error: { code: -32603, message: "EVM error InvalidFEOpcode" } }],
  ])("%s is a contract revert", async (_name, answer) => {
    expect(isContractRevert(await failedRead(answer))).toBe(true);
  });

  it.each<[string, RpcAnswer]>([
    ["-32603 Internal error", { error: { code: -32603, message: "Internal error" } }],
    [
      "-32603 Internal error with empty 0x revert data",
      { error: { code: -32603, message: "Internal error", data: "0x" } },
    ],
    [
      "-32603 Internal error whose data is the node's own text, not revert data",
      { error: { code: -32603, message: "Internal error", data: "upstream connect error" } },
    ],
    ["an empty 0x answer (no code at the address, or the wrong chain)", { result: "0x" }],
    ["-32000 header not found", { error: { code: -32000, message: "header not found" } }],
    ["HTTP 503", { status: 503, body: "Service Unavailable" }],
    ["a timeout", "hang"],
  ])("%s is not a contract revert", async (_name, answer) => {
    expect(isContractRevert(await failedRead(answer))).toBe(false);
  });

  it("a Multicall3 batch item that failed: with revert data it is a revert; with no return data it is not classified as one (the batch caller decides)", async () => {
    // One eth_call to Multicall3 answering aggregate3 with item 0 failed (empty or Error(string) return data) and
    // item 1 ok: the node answered, the failure is the item's own.
    const batchError = async (failedReturnData: `0x${string}`) => {
      const result = encodeFunctionResult({
        abi: multicall3Abi,
        functionName: "aggregate3",
        result: [
          { success: false, returnData: failedReturnData },
          { success: true, returnData: encodeAbiParameters([{ type: "uint256" }], [7n]) },
        ],
      });
      const { fetchFn } = fakeRpc(() => ({ result }));
      const client = createReadClient(URL_WITH_KEY, 1, { timeoutMs: 50, fetchFn });
      const call = { address: CONTRACT, abi: ABI, functionName: "disputes" } as const;
      const settled = client.multicall({
        contracts: [
          { ...call, args: [5000n] },
          { ...call, args: [1n] },
        ],
        allowFailure: true,
      });
      await vi.runAllTimersAsync();
      const [failed, ok] = await settled;
      expect(ok).toEqual({ status: "success", result: 7n });
      expect(failed.status).toBe("failure");
      return failed.error;
    };
    expect(isContractRevert(await batchError(revertData))).toBe(true);
    expect(isContractRevert(await batchError("0x"))).toBe(false);
  });

  it("an error that is not viem's is never a contract revert", () => {
    expect(isContractRevert(new Error("execution reverted"))).toBe(false);
  });
});

describe("describeError", () => {
  it("never repeats the URL, its host or its key, whatever failed", async () => {
    const errors = [
      await failedRequest({ status: 500, body: `upstream ${URL_WITH_KEY} failed` }, "eth_blockNumber"),
      await failedRequest("hang", "eth_blockNumber"),
      await failedRequest({ error: { code: -32000, message: `invalid api key ${KEY}` } }, "eth_blockNumber"),
      await failedRequest({ throws: new TypeError(`fetch failed: ${URL_WITH_KEY}`) }, "eth_blockNumber"),
      await failedRead({ error: { code: -32603, message: `Internal error at ${KEY}` } }),
      new TimeoutError({ body: {}, url: URL_WITH_KEY }),
      new Error(`request to ${URL_WITH_KEY} failed`),
    ];
    for (const error of errors) {
      const text = describeError(error);
      expect(text).not.toContain(KEY);
      expect(text).not.toContain("example-provider");
      expect(text).not.toMatch(/https?:/);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it("names a revert with one fixed sentence, never the contract's own text", async () => {
    expect(
      describeError(await failedRead({ error: { code: 3, message: "execution reverted", data: revertData } })),
    ).toBe("The contract rejected the call.");
  });

  it("keeps the HTTP status and the JSON-RPC code, which carry no secret", async () => {
    expect(describeError(await failedRequest({ status: 503 }, "eth_blockNumber"))).toContain("HTTP 503");
    expect(describeError(await failedRequest({ error: { code: -32000, message: "x" } }, "eth_blockNumber"))).toContain(
      "code -32000",
    );
  });

  it.each<[string, unknown]>([
    ["the node's own words", "node words here"],
    ["a list of the node's words", ["node words here"]],
    ["an object", { words: "node words here" }],
    ["an object that cannot become text", { toString: 1 }],
  ])("an error answer whose code is %s gets the plain sentence, never the value", async (_name, code) => {
    const error = await failedRequest({ error: { code, message: "x" } }, "eth_blockNumber");
    expect(describeError(error)).toBe("The request failed.");
    expect(toReadFailure(error, "the dispute").message).toBe("Could not read the dispute: The request failed.");
  });
});

describe("toReadFailure", () => {
  it.each<[string, RpcAnswer, string]>([
    ["HTTP 429", { status: 429, body: "Too Many Requests" }, "rate-limited"],
    [
      "rate limit wording",
      { error: { code: -32005, message: "daily request count exceeded, request rate limited" } },
      "rate-limited",
    ],
    ["a timeout", "hang", "timeout"],
    ["HTTP 503", { status: 503 }, "http-status"],
    ["a failed connection", { throws: new TypeError("fetch failed") }, "network"],
    ["a JSON-RPC error", { error: { code: -32000, message: "header not found" } }, "rpc-error"],
  ])("%s -> unavailable %s, with a message naming what was read and no URL", async (_name, answer, reason) => {
    const failure = toReadFailure(await failedRequest(answer, "eth_blockNumber"), "the dispute");
    expect(failure).toMatchObject({ kind: "unavailable", reason });
    expect(failure.message).toMatch(/^Could not read the dispute: /);
    expect(failure.message).not.toContain(KEY);
  });

  it("a revert is unavailable too: only the caller knows when its call reverts by design", async () => {
    const failure = toReadFailure(await failedRead({ error: { code: 3, message: "execution reverted" } }), "the court");
    expect(failure).toMatchObject({ kind: "unavailable", reason: "rpc-error" });
  });

  it("an abort is unavailable aborted", () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    expect(toReadFailure(abort, "logs")).toMatchObject({ kind: "unavailable", reason: "aborted" });
  });

  it("a non-viem error is described without its text", () => {
    expect(toReadFailure(rpcError(1, URL_WITH_KEY), "logs").message).toBe("Could not read logs: The request failed.");
  });
});
