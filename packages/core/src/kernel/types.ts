import type { Abi, PublicClient } from "viem";

/** Lowercase 0x + 40 hex inside core. EIP-55 only for display, the frozen salt key and script/display parameters. */
export type Address = `0x${string}`;
export type Hex = `0x${string}`;
/** KlerosLiquid periods: evidence, commit, vote, appeal, execution. */
export type Period = 0 | 1 | 2 | 3 | 4;

export type UnavailableReason =
  | "network"
  | "timeout"
  | "http-status"
  | "empty-reply"
  | "rpc-error"
  | "rate-limited"
  | "not-configured"
  | "budget-exhausted"
  | "aborted"
  | "not-yet-indexed"
  | "script-error"
  | "script-timeout"
  | "script-runner";
export type RefusedReason =
  | "user-rejected"
  | "no-wallet"
  | "wrong-chain"
  | "account-changed"
  | "busy"
  | "contract-would-revert"
  | "insufficient-funds"
  | "build-refused";

export type Failure =
  | { readonly kind: "unavailable"; readonly reason: UnavailableReason; readonly message: string }
  | { readonly kind: "invalid"; readonly reason: string; readonly message: string }
  | { readonly kind: "not-found"; readonly message: string }
  | { readonly kind: "refused"; readonly reason: RefusedReason; readonly message: string };

export type Outcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly failure: Failure };

export interface FetchRequest {
  readonly url: string;
  readonly method?: "GET" | "POST" | "HEAD";
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeoutMs: number;
  readonly maxBytes: number;
  readonly signal?: AbortSignal;
}
export interface FetchResponse {
  readonly status: number;
  /** Lowercase header names. */
  readonly headers: Readonly<Record<string, string>>;
  readonly bytes: Uint8Array;
}
/** Never rejects. Network error, timeout, abort -> unavailable; body over maxBytes (declared or streamed) ->
 *  invalid "too-large"; every HTTP status -> ok (the caller decides). */
export type Fetcher = (request: FetchRequest) => Promise<Outcome<FetchResponse>>;

export type ReadClient = PublicClient;
/** not-configured when the chain has no read RPC; never a public or Reown fallback. */
export type GetReadClient = (chainId: number) => Outcome<ReadClient>;

/** Storage as the browser gives it; any member may throw. Wrapped by the storage module. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

/** A contract write, built by core, sent only through the tx lifecycle. */
export interface WriteCall {
  readonly chainId: number;
  readonly address: Address;
  readonly abi: Abi;
  readonly functionName: string;
  readonly args: readonly unknown[];
  readonly value?: bigint;
}

/** Today's script contract (02.3.4), same keys and value forms. */
export interface ScriptParameters {
  readonly disputeID: string; // decimal
  readonly arbitrableContractAddress: string; // EIP-55, as web3 returned dispute.arbitrated today (UNVERIFIED casing; script gate decides)
  readonly arbitratorChainID: number;
  readonly arbitrableChainID: number;
  readonly arbitratorJsonRpcUrl: string | null;
  readonly arbitrableJsonRpcUrl: string | null;
}
/** Exact-URL rewrite inside the script frame (P43 keep: today's one Infura URL -> the arbitrable chain's read RPC). */
export interface RpcRedirect {
  readonly fromUrl: string;
  readonly toUrl: string;
}
export interface ScriptRunRequest {
  readonly scriptText: string;
  readonly params: ScriptParameters;
  /** JSON duplicate-key guard source for Reality renderer scripts (P41 keep: substring match), else null. */
  readonly guardSource: string | null;
  readonly rpcRedirects: readonly RpcRedirect[];
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}
export type ScriptRunResult =
  | { readonly status: "ok"; readonly value: unknown; readonly jsonDuplicateKeys: boolean }
  | {
      readonly status: "failed";
      readonly reason: "script-error" | "timeout" | "runner-error" | "aborted";
      readonly message: string;
      /** The duplicate-key guard fired before the failure (02.3.5: the flag reaches the host even when the script dies). */
      readonly jsonDuplicateKeys: boolean;
    };
/** Never rejects. Each run is one attempt: script-error (rejectScript or a throw) is reported at once;
 *  timeout = the timeoutMs given; runner-error = the frame never acknowledged or the runner refused (not re-run automatically).
 *  Retry policy is the caller's (doc §6.1). */
export interface ScriptRunner {
  run(request: ScriptRunRequest): Promise<ScriptRunResult>;
}
