import { describe, expect, it } from "vitest";
import {
  ACCEPTED,
  FAKE_APP_ORIGIN,
  OLD_RPC_URL,
  SAMPLE_PARAMS,
  SAMPLE_REDIRECTS,
  START,
  createFakeRunnerEnvironment,
  runRequest,
  settleMacrotasks,
  type ScriptApi,
} from "../testing";
import type { RunnerMessageEvent } from "../types";
import { bootstrapRunner } from "./bootstrap";

type OnEvaluate = (source: string, api: ScriptApi) => void;

/** A script whose `getMetaEvidence` runs `body` and returns what it returns. */
function entryPoint(body: (api: ScriptApi) => unknown): OnEvaluate {
  return (source, api) => {
    if (source === "script") api.globals.getMetaEvidence = () => body(api);
  };
}

const resolvingScript = (value: unknown) =>
  entryPoint((api) => {
    api.resolveScript(value);
  });

const rejectingScript = (reason: unknown) =>
  entryPoint((api) => {
    api.rejectScript(reason);
  });

async function repliesTo(onEvaluate?: OnEvaluate, request = runRequest()) {
  const fake = createFakeRunnerEnvironment({ onEvaluate });
  bootstrapRunner(fake.env);
  fake.deliver(fake.fromParent(request));
  await settleMacrotasks();
  return fake;
}

describe("bootstrapRunner guards", () => {
  it.each([
    ['self.origin is not "null" (no sandbox)', { selfOrigin: FAKE_APP_ORIGIN }],
    ["a top-level window", { isTopLevel: true }],
  ])("evaluates nothing and listens to nothing in %s", (_label, options) => {
    const fake = createFakeRunnerEnvironment(options);
    bootstrapRunner(fake.env);
    expect(fake.listenerCount()).toBe(0);
    fake.deliver(fake.fromParent(runRequest()));
    expect(fake.evaluated).toEqual([]);
    expect(fake.replies).toEqual([]);
  });

  it.each<[string, (event: RunnerMessageEvent) => RunnerMessageEvent]>([
    ["a message from a window other than the parent", (event) => ({ ...event, source: {} })],
    ["a message with no source", (event) => ({ ...event, source: null })],
    ["a message from another origin", (event) => ({ ...event, origin: "https://attacker.example" })],
    ['a message from the "null" origin', (event) => ({ ...event, origin: "null" })],
    ["a request with no port", (event) => ({ ...event, ports: [] })],
    ["a request with two ports", (event) => ({ ...event, ports: [...event.ports, ...event.ports] })],
  ])("ignores %s, without acknowledging it", (_label, modify) => {
    const fake = createFakeRunnerEnvironment();
    bootstrapRunner(fake.env);
    fake.deliver(modify(fake.fromParent(runRequest())));
    expect(fake.evaluated).toEqual([]);
    expect(fake.replies).toEqual([]);
    expect(fake.listenerCount()).toBe(1);
  });

  it("ignores every message when the runner's own URL has an opaque origin", () => {
    const fake = createFakeRunnerEnvironment({ locationOrigin: "null" });
    bootstrapRunner(fake.env);
    fake.deliver({ ...fake.fromParent(runRequest()), origin: "null" });
    expect(fake.evaluated).toEqual([]);
    expect(fake.replies).toEqual([]);
  });

  it("ignores messages that are not a well-formed run request, then accepts one that is", () => {
    const fake = createFakeRunnerEnvironment();
    bootstrapRunner(fake.env);
    const malformed: unknown[] = [
      null,
      "court-runner/run",
      { ...runRequest(), type: "court-runner/result" },
      { ...runRequest(), version: 1 },
      { ...runRequest(), version: 3 },
      { ...runRequest(), scriptText: 42 },
      { ...runRequest(), guardSource: 1 },
      { ...runRequest(), params: null },
      { ...runRequest(), params: { ...SAMPLE_PARAMS, arbitratorChainID: "1" } },
      { ...runRequest(), params: { ...SAMPLE_PARAMS, arbitrableChainID: 1.5 } },
      { ...runRequest(), params: { ...SAMPLE_PARAMS, disputeID: 1650 } },
      { ...runRequest(), params: { ...SAMPLE_PARAMS, arbitrableContractAddress: "0x</script>" } },
      {
        ...runRequest(),
        params: { ...SAMPLE_PARAMS, arbitrableContractAddress: "0x2018038203aee8e7a29dabd73771b0355d4f85a" },
      },
      { ...runRequest(), params: { ...SAMPLE_PARAMS, arbitratorJsonRpcUrl: 1 } },
      { ...runRequest(), rpcRedirects: OLD_RPC_URL },
      { ...runRequest(), rpcRedirects: [{ fromUrl: OLD_RPC_URL }] },
      { ...runRequest(), rpcRedirects: [{ fromUrl: 1, toUrl: "https://rpc.example/mainnet" }] },
    ];
    for (const data of malformed) fake.deliver(fake.fromParent(data));
    expect(fake.evaluated).toEqual([]);
    expect(fake.replies).toEqual([]);
    fake.deliver(fake.fromParent(runRequest()));
    expect(fake.evaluated).toEqual(["script"]);
  });

  it("accepts the arbitrable address in either case (today's parameters carry it checksummed)", () => {
    for (const address of [SAMPLE_PARAMS.arbitrableContractAddress, "0x2018038203aee8e7a29dabd73771b0355d4f85ad"]) {
      const fake = createFakeRunnerEnvironment();
      bootstrapRunner(fake.env);
      fake.deliver(fake.fromParent(runRequest({ params: { ...SAMPLE_PARAMS, arbitrableContractAddress: address } })));
      expect(fake.evaluated).toEqual(["script"]);
    }
  });

  it("accepts one request per frame, stops listening and ignores every later one", () => {
    const fake = createFakeRunnerEnvironment();
    bootstrapRunner(fake.env);
    fake.deliver(fake.fromParent(runRequest({ scriptText: "first" })));
    fake.deliver(fake.fromParent(runRequest({ scriptText: "second" })));
    expect(fake.evaluated).toEqual(["first"]);
    expect(fake.listenerCount()).toBe(0);
  });
});

describe("bootstrapRunner acknowledgement", () => {
  it("acknowledges on the request's port before the guard or the script is evaluated", async () => {
    const seenAtFirstEvaluation: unknown[][] = [];
    const fake = createFakeRunnerEnvironment({
      onEvaluate: (source, api) => {
        if (seenAtFirstEvaluation.length === 0) seenAtFirstEvaluation.push([...fake.replies]);
        if (source === "script")
          api.globals.getMetaEvidence = () => {
            api.resolveScript({ title: "after" });
          };
      },
    });
    bootstrapRunner(fake.env);
    fake.deliver(fake.fromParent(runRequest({ guardSource: "guard" })));
    expect(fake.evaluated).toEqual(["guard", "script"]);
    expect(seenAtFirstEvaluation).toEqual([[ACCEPTED]]);
    await settleMacrotasks();
    expect(fake.replies).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { title: "after" }, jsonDuplicateKeys: false },
    ]);
  });

  // The host sends the start signal once it has handled the acknowledgement; evaluating earlier could hold that
  // handling behind this script past the window on engines where frames share the host's thread.
  it("evaluates nothing until the host's start signal, ignores other port messages, and starts once", () => {
    const fake = createFakeRunnerEnvironment({ hostStarts: false });
    bootstrapRunner(fake.env);
    fake.deliver(fake.fromParent(runRequest({ guardSource: "guard" })));
    expect(fake.replies).toEqual([ACCEPTED]);
    expect(fake.evaluated).toEqual([]);
    for (const data of [null, "court-runner/start", { type: "court-runner/run" }, runRequest()]) fake.fromHost(data);
    expect(fake.evaluated).toEqual([]);
    fake.fromHost(START);
    expect(fake.evaluated).toEqual(["guard", "script"]);
    fake.fromHost(START);
    expect(fake.evaluated).toEqual(["guard", "script"]);
  });

  it("evaluates no guard when none is given", () => {
    const fake = createFakeRunnerEnvironment();
    bootstrapRunner(fake.env);
    fake.deliver(fake.fromParent(runRequest({ guardSource: null })));
    expect(fake.evaluated).toEqual(["script"]);
  });
});

describe("bootstrapRunner script-facing globals", () => {
  it("defines scriptParameters (a copy of the parameters), resolveScript and rejectScript as fixed globals", () => {
    const fake = createFakeRunnerEnvironment();
    bootstrapRunner(fake.env);
    fake.deliver(fake.fromParent(runRequest()));

    expect(fake.globals.scriptParameters).toEqual(SAMPLE_PARAMS);
    expect(fake.globals.scriptParameters).not.toBe(SAMPLE_PARAMS);
    for (const name of ["scriptParameters", "resolveScript", "rejectScript"]) {
      expect(Object.getOwnPropertyDescriptor(fake.globals, name)).toMatchObject({
        writable: false,
        configurable: false,
      });
    }
    expect(typeof fake.globals.resolveScript).toBe("function");
    expect(typeof fake.globals.rejectScript).toBe("function");
  });

  it("defines them before the script runs, so the script reads them at its top level", async () => {
    const fake = await repliesTo((_source, api) => {
      const params = api.globals.scriptParameters as { disputeID: string };
      api.globals.getMetaEvidence = () => {
        api.resolveScript({ seen: params.disputeID });
      };
    });
    expect(fake.replies).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { seen: "1650" }, jsonDuplicateKeys: false },
    ]);
  });

  it("lets a script write to its own parameter object, as today's frame does", async () => {
    const fake = await repliesTo(
      entryPoint((api) => {
        const params = api.globals.scriptParameters as Record<string, unknown>;
        params.jsonRpcUrl = params.arbitrableJsonRpcUrl;
        api.resolveScript({ rpc: params.jsonRpcUrl });
      }),
    );
    expect(fake.replies).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { rpc: "https://rpc.example/mainnet" }, jsonDuplicateKeys: false },
    ]);
  });
});

describe("bootstrapRunner run and reply", () => {
  it("reports the duplicate keys the guard recorded with the result", async () => {
    const script = entryPoint((api) => {
      api.globals.__klerosJsonDuplicateKeys = true;
      api.resolveScript({});
    });
    const fake = await repliesTo(script, runRequest({ guardSource: "guard" }));
    expect(fake.replies).toEqual([ACCEPTED, { type: "court-runner/result", value: {}, jsonDuplicateKeys: true }]);
  });

  it.each<[string, OnEvaluate | undefined, string]>([
    [
      "a syntax error in the script text",
      () => {
        throw new SyntaxError("Unexpected token");
      },
      "Unexpected token",
    ],
    [
      "getMetaEvidence throwing",
      entryPoint(() => {
        throw new Error("boom");
      }),
      "boom",
    ],
    ["a script without getMetaEvidence", undefined, "getMetaEvidence is not defined"],
    ["rejectScript with an Error", rejectingScript(new Error("question not found")), "question not found"],
    ["rejectScript with a string", rejectingScript("no question"), "no question"],
    [
      "rejectScript with a reason that is not an Error",
      rejectingScript({ code: 42 }),
      "The script reported a failure.",
    ],
    [
      "a reason whose message getter throws",
      rejectingScript({
        get message(): string {
          throw new Error("hostile");
        },
      }),
      "The script reported a failure.",
    ],
    [
      "a promise given to resolveScript that rejects",
      entryPoint((api) => {
        api.resolveScript(Promise.reject(new Error("rpc down")));
      }),
      "rpc down",
    ],
    [
      // Today's dynamic scripts are mostly async functions: a throw inside one rejects the promise it returns.
      "an async getMetaEvidence that fails",
      entryPoint(() => Promise.reject(new Error("template parse failed"))),
      "template parse failed",
    ],
    [
      "a value that cannot be copied out of the frame",
      resolvingScript({ title: "x", render: () => "not cloneable" }),
      "The script's result cannot be copied out of the runner.",
    ],
  ])("reports %s as an error at once, after the acknowledgement", async (_label, onEvaluate, message) => {
    const fake = await repliesTo(onEvaluate);
    expect(fake.replies).toEqual([ACCEPTED, { type: "court-runner/error", message, jsonDuplicateKeys: false }]);
  });

  it.each<[string, OnEvaluate]>([
    [
      "rejectScript",
      entryPoint((api) => {
        api.globals.__klerosJsonDuplicateKeys = true;
        api.rejectScript(new Error("Duplicate keys in JSON document"));
      }),
    ],
    [
      "a throw",
      entryPoint((api) => {
        api.globals.__klerosJsonDuplicateKeys = true;
        throw new SyntaxError("Duplicate keys in JSON document");
      }),
    ],
    [
      "an async failure",
      entryPoint((api) => {
        api.globals.__klerosJsonDuplicateKeys = true;
        return Promise.reject(new SyntaxError("Duplicate keys in JSON document"));
      }),
    ],
  ])("an error after the guard fired carries the duplicate-key flag (%s)", async (_label, onEvaluate) => {
    const fake = await repliesTo(onEvaluate, runRequest({ guardSource: "guard" }));
    expect(fake.replies).toEqual([
      ACCEPTED,
      { type: "court-runner/error", message: "Duplicate keys in JSON document", jsonDuplicateKeys: true },
    ]);
  });

  it("posts only the first resolve or reject, whatever the script does afterwards", async () => {
    const fake = await repliesTo(
      entryPoint((api) => {
        // The pinned Reality renderers resolve in a switch without breaks, so later cases call resolveScript again.
        api.resolveScript({ rulingOptions: { type: "single-select" } });
        api.resolveScript({ rulingOptions: { type: "uint" } });
        api.rejectScript(new Error("late"));
        return Promise.reject(new Error("later still"));
      }),
    );
    expect(fake.replies).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { rulingOptions: { type: "single-select" } }, jsonDuplicateKeys: false },
    ]);
  });

  it("resolveScript adopts a promise", async () => {
    const fake = await repliesTo(resolvingScript(Promise.resolve({ title: "adopted" })));
    expect(fake.replies).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { title: "adopted" }, jsonDuplicateKeys: false },
    ]);
  });

  it("a getMetaEvidence that returns without resolving posts nothing more (the host's timeout bounds the run)", async () => {
    const fake = await repliesTo(entryPoint(() => Promise.resolve({ title: "returned, not resolved" })));
    expect(fake.replies).toEqual([ACCEPTED]);
  });

  it("installs the exact-URL redirect before the script is evaluated", async () => {
    let topLevelRequest: Promise<Response> | undefined;
    const fake = createFakeRunnerEnvironment({
      onEvaluate: () => {
        topLevelRequest = fake.fetch(OLD_RPC_URL);
      },
    });
    bootstrapRunner(fake.env);
    fake.deliver(fake.fromParent(runRequest({ rpcRedirects: SAMPLE_REDIRECTS })));
    await topLevelRequest;
    expect(fake.requests).toEqual([{ via: "fetch", input: "https://rpc.example/mainnet", rest: [] }]);
  });
});
