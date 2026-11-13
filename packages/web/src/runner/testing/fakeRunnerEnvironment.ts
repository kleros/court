import type { RpcRedirect, ScriptParameters } from "@court/core";
import type {
  FetchFunction,
  ReplyPort,
  RunnerEnvironment,
  RunnerMessageEvent,
  RunnerReplyMessage,
  RunnerRequestMessage,
  XhrOpen,
} from "../types";

// Test support only: never imported by app code.

export const FAKE_APP_ORIGIN = "https://court.kleros.io";

/** Today's value forms (design D9): decimal id, EIP-55 arbitrable address, chain ids as numbers. */
export const SAMPLE_PARAMS: ScriptParameters = {
  disputeID: "1650",
  arbitrableContractAddress: "0x2018038203aEE8e7a29dABd73771b0355D4F85ad",
  arbitratorChainID: 1,
  arbitrableChainID: 1,
  arbitratorJsonRpcUrl: "https://rpc.example/mainnet",
  arbitrableJsonRpcUrl: "https://rpc.example/mainnet",
};

export const OLD_RPC_URL = "https://old-rpc.example/v3/0123456789abcdef";
export const SAMPLE_REDIRECTS: readonly RpcRedirect[] = [
  { fromUrl: OLD_RPC_URL, toUrl: "https://rpc.example/mainnet" },
];

export const ACCEPTED: RunnerReplyMessage = { type: "court-runner/accepted" };
export const START = { type: "court-runner/start" } as const;

export function runRequest(overrides: Partial<RunnerRequestMessage> = {}): RunnerRequestMessage {
  return {
    type: "court-runner/run",
    version: 2,
    scriptText: "script",
    params: SAMPLE_PARAMS,
    guardSource: null,
    rpcRedirects: [],
    ...overrides,
  };
}

export type FakeGlobals = Record<string, unknown>;

export interface ScriptApi {
  readonly globals: FakeGlobals;
  resolveScript(value: unknown): void;
  rejectScript(reason: unknown): void;
}

interface FakeRunnerEnvironmentOptions {
  readonly selfOrigin?: string;
  readonly isTopLevel?: boolean;
  readonly locationOrigin?: string;
  /**
   * Runs on each evaluated source instead of real code. After the script text the fake calls `getMetaEvidence` and
   * returns what it returned, as the real runner does.
   */
  readonly onEvaluate?: (source: string, api: ScriptApi) => void;
  /**
   * Default true: the fake host answers the acknowledgement with its start signal at once, as the real host does as
   * soon as it handles it. False: nothing answers; the test sends port messages itself (`fromHost`).
   */
  readonly hostStarts?: boolean;
}

export interface FakeRunnerEnvironment {
  readonly env: RunnerEnvironment;
  readonly parent: object;
  readonly globals: FakeGlobals;
  readonly evaluated: string[];
  /** Every reply posted on the fake port, structured-cloned as a real port would. */
  readonly replies: RunnerReplyMessage[];
  /** What reached the network: fetch's arguments, or an XMLHttpRequest `open` call with the request it ran on. */
  readonly requests: (
    | { readonly via: "fetch"; readonly input: unknown; readonly rest: readonly unknown[] }
    | {
        readonly via: "xhr";
        readonly receiver: XMLHttpRequest;
        readonly method: string;
        readonly input: unknown;
        readonly rest: readonly unknown[];
      }
  )[];
  listenerCount(): number;
  deliver(event: RunnerMessageEvent): void;
  fromParent(data: unknown): RunnerMessageEvent;
  /** A message from the host on the port of the last `fromParent` event. */
  fromHost(data: unknown): void;
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  /** `request.open(method, url, ...rest)` through the current (possibly wrapped) open. */
  xhrOpen(request: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]): void;
}

function callable(value: unknown, name: string): (argument: unknown) => void {
  if (typeof value !== "function") throw new TypeError(`${name} is not defined`);
  return (argument) => {
    Reflect.apply(value, undefined, [argument]);
  };
}

/**
 * A fake `RunnerEnvironment` for `bootstrapRunner`: a sandboxed, framed page on the app's URL by default, whose
 * `evaluate` runs `onEvaluate` instead of real code and whose port records replies.
 */
export function createFakeRunnerEnvironment(options: FakeRunnerEnvironmentOptions = {}): FakeRunnerEnvironment {
  const parent = {};
  const globals: FakeGlobals = {};
  const evaluated: string[] = [];
  const replies: RunnerReplyMessage[] = [];
  const requests: FakeRunnerEnvironment["requests"] = [];
  const listeners = new Set<(event: RunnerMessageEvent) => void>();
  let lastPort: ReplyPort | undefined;
  const fromHost = (data: unknown): void => {
    lastPort?.onmessage?.(new MessageEvent("message", { data }));
  };

  let currentFetch: FetchFunction = (input, init) => {
    requests.push({ via: "fetch", input, rest: init === undefined ? [] : [init] });
    return Promise.resolve(new Response("{}"));
  };
  // A function, not an arrow: the native open runs on the request it is called on, so the fake records `this`.
  let currentOpen: XhrOpen = function open(this: XMLHttpRequest, method, url, ...rest) {
    requests.push({ via: "xhr", receiver: this, method, input: url, rest });
  };

  const api: ScriptApi = {
    globals,
    resolveScript: (value) => {
      callable(globals.resolveScript, "resolveScript")(value);
    },
    rejectScript: (reason) => {
      callable(globals.rejectScript, "rejectScript")(reason);
    },
  };

  const env: RunnerEnvironment = {
    selfOrigin: options.selfOrigin ?? "null",
    isTopLevel: options.isTopLevel ?? false,
    parent,
    locationOrigin: options.locationOrigin ?? FAKE_APP_ORIGIN,
    addMessageListener(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    globals,
    evaluate(source) {
      evaluated.push(source);
      options.onEvaluate?.(source, api);
    },
    runScript(scriptText) {
      evaluated.push(scriptText);
      options.onEvaluate?.(scriptText, api);
      const entryPoint = globals.getMetaEvidence;
      if (typeof entryPoint !== "function") throw new ReferenceError("getMetaEvidence is not defined");
      return Reflect.apply(entryPoint, undefined, []) as unknown;
    },
    network: {
      wrapFetch(wrap) {
        currentFetch = wrap(currentFetch);
      },
      wrapXhrOpen(wrap) {
        currentOpen = wrap(currentOpen);
      },
    },
  };

  return {
    env,
    parent,
    globals,
    evaluated,
    replies,
    requests,
    listenerCount: () => listeners.size,
    deliver(event) {
      for (const listener of listeners) listener(event);
    },
    fromParent(data) {
      const port: ReplyPort = {
        postMessage(message) {
          replies.push(structuredClone(message));
          if (message.type === "court-runner/accepted" && options.hostStarts !== false) fromHost(START);
        },
        onmessage: null,
      };
      lastPort = port;
      return { source: parent, origin: FAKE_APP_ORIGIN, data, ports: [port] };
    },
    fromHost,
    fetch: (input, init) => currentFetch(input, init),
    xhrOpen(request, method, url, ...rest) {
      currentOpen.call(request, method, url, ...rest);
    },
  };
}
