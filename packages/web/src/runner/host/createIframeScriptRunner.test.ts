import type { ScriptParameters, ScriptRunRequest } from "@court/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RUNNER_PATH } from "../protocol";
import {
  SAMPLE_PARAMS,
  SAMPLE_REDIRECTS,
  createFakeRunnerDocument,
  settleMacrotasks,
  type FakeRunnerDocument,
  type FakeRunnerFrame,
} from "../testing";
import { createIframeScriptRunner } from "./createIframeScriptRunner";

function setup(maxConcurrent = 4) {
  const fake = createFakeRunnerDocument();
  const runner = createIframeScriptRunner({
    document: fake.document,
    runnerUrl: RUNNER_PATH,
    maxConcurrent,
    ackWindowMs: 5_000,
  });
  return { fake, runner };
}

async function isPending(run: Promise<unknown>): Promise<boolean> {
  let settled = false;
  void run.then(() => {
    settled = true;
  });
  await settleMacrotasks();
  return !settled;
}

function frameAt(fake: FakeRunnerDocument, index: number): FakeRunnerFrame {
  const frame = fake.frames[index];
  if (frame === undefined) throw new Error(`The host created no frame ${index}.`);
  return frame;
}

// Aborted after each test so that runs a test leaves pending release their frames, ports and timers.
let leftovers = new AbortController();

function request(overrides: Partial<ScriptRunRequest> = {}): ScriptRunRequest {
  return {
    scriptText: "function getMetaEvidence() {}",
    params: SAMPLE_PARAMS,
    guardSource: null,
    rpcRedirects: [],
    timeoutMs: 60_000,
    signal: leftovers.signal,
    ...overrides,
  };
}

/** A request as an untrusted caller could pass it at runtime, whatever its static type says. */
function withParams(overrides: Record<string, unknown>): ScriptRunRequest {
  const params: unknown = { ...SAMPLE_PARAMS, ...overrides };
  return request({ params: params as ScriptParameters });
}

function withRequest(overrides: Record<string, unknown>): ScriptRunRequest {
  const value: unknown = { ...request(), ...overrides };
  return value as ScriptRunRequest;
}

beforeEach(() => {
  leftovers = new AbortController();
});

afterEach(() => {
  leftovers.abort();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("request checks before any frame exists", () => {
  it.each([
    ["a disputeID carrying markup", { disputeID: "1</script><script>alert(1)</script>" }],
    ["a disputeID with a leading zero", { disputeID: "01" }],
    ["a non-ASCII-digit disputeID", { disputeID: "١٢" }],
    ["an empty disputeID", { disputeID: "" }],
    ["a chain ID carrying markup", { arbitratorChainID: "1</script>" }],
    ["a chain ID given as a string", { arbitrableChainID: "1" }],
    ["a chain ID with a leading zero", { arbitratorChainID: "01" }],
    ["a non-integer chain ID", { arbitratorChainID: 1.5 }],
    ["a chain with no read-RPC setting", { arbitrableChainID: 56 }],
    ["an inherited key as a chain ID", { arbitrableChainID: "constructor" }],
    ["an address carrying markup", { arbitrableContractAddress: "0x</script>" }],
    ["an address one digit short", { arbitrableContractAddress: "0x2018038203aEE8e7a29dABd73771b0355D4F85a" }],
    ["a plain-http RPC URL", { arbitratorJsonRpcUrl: "http://rpc.example/mainnet" }],
    ["a javascript: RPC URL", { arbitrableJsonRpcUrl: "javascript:alert(1)" }],
    ["a relative RPC URL", { arbitratorJsonRpcUrl: "/rpc" }],
  ])("refuses %s at once (runner-error), without a frame", async (_label, overrides) => {
    const { fake, runner } = setup();
    await expect(runner.run(withParams(overrides))).resolves.toMatchObject({
      status: "failed",
      reason: "runner-error",
      jsonDuplicateKeys: false,
    });
    expect(fake.frames).toEqual([]);
  });

  it.each([
    ["a script text that is not a string", { scriptText: 42 }],
    ["a guard source that is not a string", { guardSource: 1 }],
    ["redirects that are not a list", { rpcRedirects: "https://old-rpc.example/" }],
    [
      "a redirect to a plain-http URL",
      { rpcRedirects: [{ fromUrl: "https://old.example/", toUrl: "http://rpc.example/" }] },
    ],
    ["a redirect from a non-URL", { rpcRedirects: [{ fromUrl: "old", toUrl: "https://rpc.example/" }] }],
    ["parameters that are missing", { params: null }],
  ])("refuses %s at once, without a frame", async (_label, overrides) => {
    const { fake, runner } = setup();
    await expect(runner.run(withRequest(overrides))).resolves.toMatchObject({
      status: "failed",
      reason: "runner-error",
    });
    expect(fake.frames).toEqual([]);
  });

  it.each([
    ["the checksummed arbitrable address", {}],
    ["a lowercase arbitrable address", { arbitrableContractAddress: "0x2018038203aee8e7a29dabd73771b0355d4f85ad" }],
    ["null RPC URLs", { arbitratorJsonRpcUrl: null, arbitrableJsonRpcUrl: null }],
    ["another configured chain as the arbitrable's", { arbitrableChainID: 137 }],
  ])("accepts %s", async (_label, overrides) => {
    const { fake, runner } = setup();
    const run = runner.run(withParams(overrides));
    frameAt(fake, 0).load().reply({ type: "court-runner/result", value: {}, jsonDuplicateKeys: false });
    await expect(run).resolves.toEqual({ status: "ok", value: {}, jsonDuplicateKeys: false });
  });

  it("posts only the six script parameters and the two redirect fields, never extra fields", () => {
    const { fake, runner } = setup();
    const redirect: unknown = { ...SAMPLE_REDIRECTS[0], note: "extra" };
    void runner.run({
      ...withParams({ jsonRpcUrl: "https://rpc.example/extra" }),
      rpcRedirects: [redirect as (typeof SAMPLE_REDIRECTS)[number]],
    });
    const posted = frameAt(fake, 0).load().message as {
      params: Record<string, unknown>;
      rpcRedirects: Record<string, unknown>[];
    };
    expect(Object.keys(posted.params).sort()).toEqual(Object.keys(SAMPLE_PARAMS).sort());
    expect(posted.rpcRedirects).toEqual(SAMPLE_REDIRECTS);
  });
});

describe("runner frame", () => {
  it("sets the sandbox before the source", () => {
    const { fake, runner } = setup();
    void runner.run(request());
    const order = frameAt(fake, 0).attributeOrder();
    expect(order.filter((name) => name === "sandbox" || name === "src")).toEqual(["sandbox", "src"]);
  });

  it("sandboxes the frame with allow-scripts only, hidden, without a referrer, at the runner page's URL", () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL");
    const { fake, runner } = setup();
    void runner.run(request());
    const frame = frameAt(fake, 0).element;
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    expect(frame.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(frame.getAttribute("aria-hidden")).toBe("true");
    expect(frame.getAttribute("tabindex")).toBe("-1");
    expect(frame.style.display).toBe("none");
    expect(frame.getAttribute("src")).toBe(RUNNER_PATH);
    expect(frame.isConnected).toBe(true);
    // A static page, not generated HTML: no blob URL is ever created, so none can leak.
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it.each([1, 100, 11155111, 10200])("gives a run on chain %i the same opaque frame (testnets included)", (chainId) => {
    const { fake, runner } = setup();
    void runner.run(withParams({ arbitratorChainID: chainId, arbitrableChainID: chainId }));
    expect(frameAt(fake, 0).element.getAttribute("sandbox")).toBe("allow-scripts");
  });

  it("posts nothing before the frame loads, then one request with target '*' and one fresh port", () => {
    const { fake, runner } = setup();
    void runner.run(request({ guardSource: "guard()", rpcRedirects: SAMPLE_REDIRECTS }));
    const frame = frameAt(fake, 0);
    expect(frame.watchPosts()).toEqual([]);
    const posted = frame.load();
    expect(posted.targetOrigin).toBe("*");
    expect(posted.ports).toHaveLength(1);
    expect(posted.message).toEqual({
      type: "court-runner/run",
      version: 2,
      scriptText: "function getMetaEvidence() {}",
      params: SAMPLE_PARAMS,
      guardSource: "guard()",
      rpcRedirects: SAMPLE_REDIRECTS,
    });
  });

  it("gives every run its own frame and its own port", () => {
    const { fake, runner } = setup();
    void runner.run(request());
    void runner.run(request());
    const first = frameAt(fake, 0);
    const second = frameAt(fake, 1);
    const [firstPort] = first.load().ports;
    const [secondPort] = second.load().ports;
    expect(first.element).not.toBe(second.element);
    expect(firstPort).toBeDefined();
    expect(firstPort).not.toBe(secondPort);
  });
});

describe("results", () => {
  it("settles ok with the value and duplicate-key flag the port carried", async () => {
    const { fake, runner } = setup();
    const run = runner.run(request());
    frameAt(fake, 0)
      .load()
      .reply({
        type: "court-runner/result",
        value: { rulingOptions: { titles: ["Harris", "Trump"] } },
        jsonDuplicateKeys: true,
      });
    await expect(run).resolves.toEqual({
      status: "ok",
      value: { rulingOptions: { titles: ["Harris", "Trump"] } },
      jsonDuplicateKeys: true,
    });
  });

  it.each([true, false])("settles script-error at once when the script failed (duplicate keys: %s)", async (flag) => {
    const { fake, runner } = setup();
    const run = runner.run(request());
    frameAt(fake, 0)
      .load()
      .reply({ type: "court-runner/error", message: "question not found", jsonDuplicateKeys: flag });
    await expect(run).resolves.toEqual({
      status: "failed",
      reason: "script-error",
      message: "The dynamic script failed: question not found",
      jsonDuplicateKeys: flag,
    });
  });

  it("bounds the script's own text in the failure message", async () => {
    const { fake, runner } = setup();
    const run = runner.run(request());
    frameAt(fake, 0)
      .load()
      .reply({ type: "court-runner/error", message: "x".repeat(10_000), jsonDuplicateKeys: false });
    const result = await run;
    expect(result.status === "failed" ? result.message.length : 0).toBe("The dynamic script failed: ".length + 300);
  });

  it.each([
    ["a reply of an unknown type", { type: "court-runner/other" }],
    ["a result without its flag", { type: "court-runner/result", value: {} }],
    ["an error without a message", { type: "court-runner/error", jsonDuplicateKeys: false }],
    ["an error without its flag", { type: "court-runner/error", message: "x" }],
    ["a reply of another protocol", { type: "dr-runner/result", value: {}, jsonDuplicateKeys: false }],
    ["a bare value", "{}"],
  ])("settles runner-error for %s", async (_label, reply) => {
    const { fake, runner } = setup();
    const run = runner.run(request());
    frameAt(fake, 0).load().reply(reply);
    await expect(run).resolves.toMatchObject({ status: "failed", reason: "runner-error", jsonDuplicateKeys: false });
  });

  it("has no window message listener: a message posted to the window resolves nothing", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const { fake, runner } = setup();
    const run = runner.run(request());
    const posted = frameAt(fake, 0).load();

    const forged = { type: "court-runner/result", value: { title: "forged" }, jsonDuplicateKeys: false };
    window.dispatchEvent(new MessageEvent("message", { data: forged, origin: "https://attacker.example" }));
    window.postMessage(forged, location.origin);
    await settleMacrotasks();
    expect(await isPending(run)).toBe(true);

    posted.reply({ type: "court-runner/result", value: { title: "genuine" }, jsonDuplicateKeys: false });
    await expect(run).resolves.toEqual({ status: "ok", value: { title: "genuine" }, jsonDuplicateKeys: false });
    expect(addEventListener.mock.calls.map(([type]) => type)).not.toContain("message");
  });

  it("removes the frame and closes the port once the run settles, and ignores later replies", async () => {
    const close = vi.spyOn(MessagePort.prototype, "close");
    const { fake, runner } = setup();
    const run = runner.run(request());
    const posted = frameAt(fake, 0).load();
    posted.reply({ type: "court-runner/result", value: { title: "first" }, jsonDuplicateKeys: false });
    await expect(run).resolves.toMatchObject({ status: "ok", value: { title: "first" } });
    expect(fake.attachedFrames()).toEqual([]);
    expect(close).toHaveBeenCalledTimes(1);

    posted.reply({ type: "court-runner/error", message: "late", jsonDuplicateKeys: false });
    await settleMacrotasks();
    await expect(run).resolves.toMatchObject({ status: "ok", value: { title: "first" } });
  });

  it("stops listening to the caller's abort signal once the run settles", async () => {
    const controller = new AbortController();
    const added = vi.spyOn(controller.signal, "addEventListener");
    const removed = vi.spyOn(controller.signal, "removeEventListener");
    const { fake, runner } = setup();
    const run = runner.run(request({ signal: controller.signal }));
    frameAt(fake, 0).load().reply({ type: "court-runner/result", value: {}, jsonDuplicateKeys: false });
    await expect(run).resolves.toMatchObject({ status: "ok" });
    const [listened] = added.mock.calls.filter(([type]) => type === "abort");
    expect(listened).toBeDefined();
    expect(removed).toHaveBeenCalledWith("abort", listened?.[1]);
  });
});

describe("timeout and abort", () => {
  it("times out a run that never answers, removes its frame, closes its port and clears its timers", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const close = vi.spyOn(MessagePort.prototype, "close");
    const { fake, runner } = setup();
    const run = runner.run(request({ timeoutMs: 1_000 }));
    frameAt(fake, 0).load();
    vi.advanceTimersByTime(999);
    expect(fake.attachedFrames()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    await expect(run).resolves.toEqual({
      status: "failed",
      reason: "timeout",
      message: "The dynamic script for dispute 1650 timed out.",
      jsonDuplicateKeys: false,
    });
    expect(fake.attachedFrames()).toEqual([]);
    expect(close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("times out a run with no time left without creating a frame", async () => {
    const { fake, runner } = setup();
    for (const timeoutMs of [0, -5, Number.NaN]) {
      await expect(runner.run(request({ timeoutMs }))).resolves.toMatchObject({ status: "failed", reason: "timeout" });
    }
    expect(fake.frames).toEqual([]);
  });

  it("creates no frame for an already aborted run", async () => {
    const { fake, runner } = setup();
    await expect(runner.run(request({ signal: AbortSignal.abort() }))).resolves.toMatchObject({
      status: "failed",
      reason: "aborted",
      jsonDuplicateKeys: false,
    });
    expect(fake.frames).toEqual([]);
  });

  it("aborting a running script settles aborted, removes the frame, closes the port and clears the timers", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const close = vi.spyOn(MessagePort.prototype, "close");
    const { fake, runner } = setup();
    const controller = new AbortController();
    const run = runner.run(request({ signal: controller.signal }));
    frameAt(fake, 0).load().acknowledge();
    await settleMacrotasks();
    controller.abort();
    await expect(run).resolves.toMatchObject({ status: "failed", reason: "aborted" });
    expect(fake.attachedFrames()).toEqual([]);
    expect(close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("acknowledgement window", () => {
  const NOT_STARTED = /did not start within 5 seconds/;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  it("a frame whose load never fires settles runner-error when the window ends, and is removed", async () => {
    const { fake, runner } = setup();
    const run = runner.run(request({ timeoutMs: 60_000 }));
    vi.advanceTimersByTime(4_999);
    expect(await isPending(run)).toBe(true);
    expect(fake.attachedFrames()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    await expect(run).resolves.toEqual({
      status: "failed",
      reason: "runner-error",
      message: expect.stringMatching(NOT_STARTED) as unknown,
      jsonDuplicateKeys: false,
    });
    expect(fake.attachedFrames()).toEqual([]);
  });

  it("a frame that loads but never acknowledges settles runner-error at the window's end", async () => {
    const close = vi.spyOn(MessagePort.prototype, "close");
    const { fake, runner } = setup();
    const run = runner.run(request());
    frameAt(fake, 0).load();
    vi.advanceTimersByTime(5_000);
    await expect(run).resolves.toMatchObject({
      status: "failed",
      reason: "runner-error",
      message: expect.stringMatching(NOT_STARTED) as unknown,
    });
    expect(fake.attachedFrames()).toEqual([]);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("the acknowledgement cancels the window; the run then waits for its result until its timeout", async () => {
    const { fake, runner } = setup();
    const run = runner.run(request({ timeoutMs: 60_000 }));
    vi.advanceTimersByTime(4_900);
    frameAt(fake, 0).load().acknowledge();
    await settleMacrotasks();
    vi.advanceTimersByTime(200);
    expect(await isPending(run)).toBe(true);
    expect(fake.attachedFrames()).toHaveLength(1);
    vi.advanceTimersByTime(60_000 - 5_100);
    await expect(run).resolves.toMatchObject({ status: "failed", reason: "timeout" });
    expect(fake.attachedFrames()).toEqual([]);
  });

  it("acknowledgements never settle the run nor carry anything through, and a second one is ignored", async () => {
    const { fake, runner } = setup();
    const run = runner.run(request());
    const posted = frameAt(fake, 0).load();
    posted.reply({ type: "court-runner/accepted", value: { title: "smuggled" }, jsonDuplicateKeys: false });
    await settleMacrotasks();
    posted.acknowledge();
    await settleMacrotasks();
    vi.advanceTimersByTime(5_000);
    expect(await isPending(run)).toBe(true);
    posted.reply({ type: "court-runner/result", value: { title: "genuine" }, jsonDuplicateKeys: false });
    await expect(run).resolves.toEqual({ status: "ok", value: { title: "genuine" }, jsonDuplicateKeys: false });
  });

  it("the window counts from the frame's append, not from run()", async () => {
    const { fake, runner } = setup(1);
    const controller = new AbortController();
    const first = runner.run(request({ signal: controller.signal }));
    const queued = runner.run(request());
    frameAt(fake, 0).load().acknowledge();
    await settleMacrotasks();
    vi.advanceTimersByTime(6_000);
    expect(fake.frames).toHaveLength(1);
    controller.abort();
    await expect(first).resolves.toMatchObject({ status: "failed", reason: "aborted" });
    expect(fake.attachedFrames()).toHaveLength(1);
    expect(fake.frames).toHaveLength(2);

    vi.advanceTimersByTime(4_999);
    expect(await isPending(queued)).toBe(true);
    vi.advanceTimersByTime(1);
    await expect(queued).resolves.toMatchObject({
      status: "failed",
      reason: "runner-error",
      message: expect.stringMatching(NOT_STARTED) as unknown,
    });
    expect(fake.attachedFrames()).toEqual([]);
  });
});

// Runner frames share one thread, so another run's script would otherwise eat a loading frame's window and a healthy
// run would end runner-error.
describe("acknowledgement window while other runs execute", () => {
  const NOT_STARTED = /did not start within 5 seconds/;
  const result = { type: "court-runner/result", value: {}, jsonDuplicateKeys: false };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  it("sends the start signal on the port once it handles the acknowledgement, and only once", async () => {
    const { fake, runner } = setup();
    void runner.run(request());
    const posted = frameAt(fake, 0).load();
    await settleMacrotasks();
    expect(posted.received).toEqual([]);
    posted.acknowledge();
    await settleMacrotasks();
    expect(posted.received).toEqual([{ type: "court-runner/start" }]);
    posted.acknowledge();
    await settleMacrotasks();
    expect(posted.received).toEqual([{ type: "court-runner/start" }]);
  });

  it("a loading frame's window stops while other runs execute and restarts in full when the last one ends", async () => {
    const { fake, runner } = setup();
    const first = runner.run(request());
    const second = runner.run(request());
    const loading = runner.run(request());
    const firstPost = frameAt(fake, 0).load();
    const secondPost = frameAt(fake, 1).load();
    firstPost.acknowledge();
    secondPost.acknowledge();
    await settleMacrotasks();

    vi.advanceTimersByTime(8_000);
    expect(await isPending(loading)).toBe(true);
    firstPost.reply(result);
    await expect(first).resolves.toMatchObject({ status: "ok" });
    vi.advanceTimersByTime(8_000);
    expect(await isPending(loading)).toBe(true);
    secondPost.reply(result);
    await expect(second).resolves.toMatchObject({ status: "ok" });

    vi.advanceTimersByTime(4_999);
    expect(await isPending(loading)).toBe(true);
    vi.advanceTimersByTime(1);
    await expect(loading).resolves.toMatchObject({
      status: "failed",
      reason: "runner-error",
      message: expect.stringMatching(NOT_STARTED) as unknown,
    });
  });

  it("a frame appended while another run executes gets its window only when that run ends, however it ends", async () => {
    const { fake, runner } = setup();
    const controller = new AbortController();
    const executing = runner.run(request({ signal: controller.signal }));
    frameAt(fake, 0).load().acknowledge();
    await settleMacrotasks();
    const later = runner.run(request());
    expect(fake.frames).toHaveLength(2);

    vi.advanceTimersByTime(10_000);
    expect(await isPending(later)).toBe(true);
    controller.abort();
    await expect(executing).resolves.toMatchObject({ reason: "aborted" });
    vi.advanceTimersByTime(4_999);
    expect(await isPending(later)).toBe(true);
    const laterPost = frameAt(fake, 1).load();
    laterPost.acknowledge();
    await settleMacrotasks();
    vi.advanceTimersByTime(10_000);
    laterPost.reply(result);
    await expect(later).resolves.toMatchObject({ status: "ok" });
  });

  it("a run that ends before its acknowledgement leaves the other windows counting from their append", async () => {
    const { fake, runner } = setup();
    const controller = new AbortController();
    const gone = runner.run(request({ signal: controller.signal }));
    const loading = runner.run(request());
    vi.advanceTimersByTime(3_000);
    controller.abort();
    await expect(gone).resolves.toMatchObject({ reason: "aborted" });
    vi.advanceTimersByTime(1_999);
    expect(await isPending(loading)).toBe(true);
    vi.advanceTimersByTime(1);
    await expect(loading).resolves.toMatchObject({ reason: "runner-error" });
    expect(fake.attachedFrames()).toEqual([]);
  });
});

describe("concurrency", () => {
  it("runs at most four frames at once and starts the waiting runs in order (FIFO)", async () => {
    const { fake, runner } = setup();
    const runs = ["1", "2", "3", "4", "5", "6"].map((disputeID) =>
      runner.run(request({ params: { ...SAMPLE_PARAMS, disputeID } })),
    );
    expect(fake.frames).toHaveLength(4);
    frameAt(fake, 1).load().reply({ type: "court-runner/result", value: "2", jsonDuplicateKeys: false });
    await expect(runs[1]).resolves.toMatchObject({ status: "ok", value: "2" });
    expect(fake.frames).toHaveLength(5);
    expect(frameAt(fake, 4).load().message).toMatchObject({ params: { disputeID: "5" } });
    frameAt(fake, 0).load().reply({ type: "court-runner/result", value: "1", jsonDuplicateKeys: false });
    await expect(runs[0]).resolves.toMatchObject({ status: "ok", value: "1" });
    expect(frameAt(fake, 5).load().message).toMatchObject({ params: { disputeID: "6" } });
  });

  it("concurrent runs each settle with the reply of their own port", async () => {
    const { fake, runner } = setup();
    const first = runner.run(request());
    const second = runner.run(request());
    const firstPost = frameAt(fake, 0).load();
    const secondPost = frameAt(fake, 1).load();
    secondPost.reply({ type: "court-runner/result", value: "second", jsonDuplicateKeys: false });
    firstPost.reply({ type: "court-runner/result", value: "first", jsonDuplicateKeys: false });
    await expect(first).resolves.toMatchObject({ value: "first" });
    await expect(second).resolves.toMatchObject({ value: "second" });
  });

  it("counts time spent waiting for a frame against the run's timeout", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { fake, runner } = setup(1);
    const first = runner.run(request({ timeoutMs: 10_000 }));
    const queued = runner.run(request({ timeoutMs: 1_000 }));
    vi.advanceTimersByTime(1_000);
    await expect(queued).resolves.toMatchObject({ status: "failed", reason: "timeout" });
    expect(fake.frames).toHaveLength(1);

    frameAt(fake, 0).load().reply({ type: "court-runner/result", value: {}, jsonDuplicateKeys: false });
    await expect(first).resolves.toMatchObject({ status: "ok" });
    expect(fake.frames).toHaveLength(1);
  });

  it("aborting a waiting run settles it without a frame and keeps the queue moving", async () => {
    const { fake, runner } = setup(1);
    const controller = new AbortController();
    const first = runner.run(request());
    const aborted = runner.run(request({ signal: controller.signal }));
    const third = runner.run(request({ params: { ...SAMPLE_PARAMS, disputeID: "3" } }));
    controller.abort();
    await expect(aborted).resolves.toMatchObject({ status: "failed", reason: "aborted" });

    frameAt(fake, 0).load().reply({ type: "court-runner/result", value: {}, jsonDuplicateKeys: false });
    await expect(first).resolves.toMatchObject({ status: "ok" });
    expect(fake.frames).toHaveLength(2);
    const thirdPost = frameAt(fake, 1).load();
    expect(thirdPost.message).toMatchObject({ params: { disputeID: "3" } });
    thirdPost.reply({ type: "court-runner/result", value: { title: "3" }, jsonDuplicateKeys: false });
    await expect(third).resolves.toMatchObject({ status: "ok", value: { title: "3" } });
  });

  it("refuses a concurrency cap that is not a positive integer", () => {
    const fake = createFakeRunnerDocument();
    for (const maxConcurrent of [0, 1.5, Number.NaN]) {
      expect(() => createIframeScriptRunner({ document: fake.document, maxConcurrent })).toThrow(RangeError);
    }
  });
});

describe("defaults and frame failures", () => {
  it("defaults to the runner page, four frames and a five-second acknowledgement window", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const fake = createFakeRunnerDocument();
    const runner = createIframeScriptRunner({ document: fake.document });
    const runs = [1, 2, 3, 4, 5].map(() => runner.run(request()));
    expect(fake.frames).toHaveLength(4);
    expect(frameAt(fake, 0).element.getAttribute("src")).toBe(RUNNER_PATH);
    vi.advanceTimersByTime(4_999);
    expect(await isPending(runs[0] ?? Promise.resolve())).toBe(true);
    vi.advanceTimersByTime(1);
    await expect(runs[0]).resolves.toMatchObject({ status: "failed", reason: "runner-error" });
  });

  it("a run whose frame cannot be opened fails without rejecting and frees its place", async () => {
    const brokenDocument = {
      body: document.body,
      createElement() {
        throw new Error("no DOM");
      },
    };
    const runner = createIframeScriptRunner({ document: brokenDocument as unknown as Document, maxConcurrent: 1 });
    const first = runner.run(request());
    const second = runner.run(request());
    await expect(first).resolves.toMatchObject({ status: "failed", reason: "runner-error" });
    await expect(second).resolves.toMatchObject({ status: "failed", reason: "runner-error" });
  });

  it("keeps the frames in one hidden container and makes a new one if the page removed it", () => {
    const { fake, runner } = setup();
    void runner.run(request());
    const firstContainer = frameAt(fake, 0).element.parentElement;
    expect(firstContainer?.hidden).toBe(true);
    expect(firstContainer?.parentElement).toBe(document.body);

    document.body.replaceChildren();
    void runner.run(request());
    const secondContainer = frameAt(fake, 1).element.parentElement;
    expect(secondContainer).not.toBe(firstContainer);
    expect(secondContainer?.hidden).toBe(true);
    expect(secondContainer?.isConnected).toBe(true);
  });
});
