import type { RpcRedirect, ScriptParameters } from "@court/core";

export interface IframeRunnerOptions {
  readonly document: Document;
  /** Default RUNNER_PATH. */
  readonly runnerUrl?: string;
  /** Default MAX_CONCURRENT_RUNS. */
  readonly maxConcurrent?: number;
  /** Default ACK_WINDOW_MS. */
  readonly ackWindowMs?: number;
}

/** The one message the host posts to a runner frame, with the reply port transferred alongside. */
export interface RunnerRequestMessage {
  readonly type: "court-runner/run";
  readonly version: 2;
  readonly scriptText: string;
  readonly params: ScriptParameters;
  readonly guardSource: string | null;
  readonly rpcRedirects: readonly RpcRedirect[];
}

/**
 * Posted only through the transferred port: exactly one `accepted`, then (after the host's start signal) at most one
 * `result` or `error`.
 */
export type RunnerReplyMessage =
  | { readonly type: "court-runner/accepted" }
  | { readonly type: "court-runner/result"; readonly value: unknown; readonly jsonDuplicateKeys: boolean }
  | { readonly type: "court-runner/error"; readonly message: string; readonly jsonDuplicateKeys: boolean };

/** The run's port: replies go out; the host's one message, its start signal, comes in. */
export interface ReplyPort {
  postMessage(message: RunnerReplyMessage): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
}

export interface RunnerMessageEvent {
  readonly source: unknown;
  readonly origin: string;
  readonly data: unknown;
  readonly ports: readonly ReplyPort[];
}

export type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** Optional arguments are passed through as given: an explicit `undefined` `async` would make the request synchronous. */
export type XhrOpen = (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) => void;

export interface NetworkHooks {
  wrapFetch(wrap: (original: FetchFunction) => FetchFunction): void;
  wrapXhrOpen(wrap: (original: XhrOpen) => XhrOpen): void;
}

/** Everything the runner page's bootstrap touches, so every guard is testable with a fake. */
export interface RunnerEnvironment {
  /** `self.origin`: `"null"` only when the document really is sandboxed. */
  readonly selfOrigin: string;
  readonly isTopLevel: boolean;
  readonly parent: unknown;
  /** `location.origin`: the runner URL's origin, which is the app's even inside an opaque-origin document. */
  readonly locationOrigin: string;
  addMessageListener(listener: (event: RunnerMessageEvent) => void): () => void;
  /** Where the script-facing globals are defined (the page's `globalThis`). */
  readonly globals: object;
  /** Evaluates source text in the global scope, as a classic `<script>` would. */
  evaluate(source: string): void;
  /** Evaluates the script text and calls its `getMetaEvidence()` in the same evaluation; returns what that call returned. */
  runScript(scriptText: string): unknown;
  readonly network: NetworkHooks;
}
