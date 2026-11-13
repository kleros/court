/**
 * Test helper for this folder's tests only (index.ts does not export it): a JSON-RPC endpoint as a fetch function, so
 * viem's real http transport runs with no network. Every answer is synthetic: the lab's RPC faces add no limits or
 * provider errors (lab DEVIATIONS D18), so error shapes follow the providers' documented answers.
 */
import { createPublicClient, custom } from "viem";
import type { ReadClient } from "../kernel/index.ts";

export interface RpcCall {
  readonly method: string;
  readonly params: readonly unknown[];
  /** Milliseconds since the fake was made (fake timers move it too). */
  readonly at: number;
}

export type RpcAnswer =
  | { readonly result: unknown }
  // `code` is any JSON the node sends; viem copies it as sent.
  | { readonly error: { readonly code: unknown; readonly message: string; readonly data?: unknown } }
  | { readonly status: number; readonly body?: string }
  | { readonly throws: Error }
  | "hang";

export function fakeRpc(answer: (call: RpcCall, index: number) => RpcAnswer): {
  fetchFn: typeof globalThis.fetch;
  calls: RpcCall[];
} {
  const calls: RpcCall[] = [];
  const start = Date.now();
  const fetchFn = (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(typeof init?.body === "string" ? init.body : "") as {
      id: number;
      method: string;
      params?: unknown[];
    };
    const call = { method: body.method, params: body.params ?? [], at: Date.now() - start };
    calls.push(call);
    const reply = answer(call, calls.length - 1);
    if (reply === "hang") {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    }
    if ("throws" in reply) return Promise.reject(reply.throws);
    if ("status" in reply) return Promise.resolve(new Response(reply.body ?? "", { status: reply.status }));
    const json = { jsonrpc: "2.0", id: body.id, ...reply };
    return Promise.resolve(
      new Response(JSON.stringify(json), { status: 200, headers: { "content-type": "application/json" } }),
    );
  };
  return { fetchFn, calls };
}

/**
 * A client over an EIP-1193-style request function with viem's retries off, as other modules' fixtures build them:
 * an error thrown here reaches viem the way a provider's error object would.
 */
export function customClient(request: (method: string, params: readonly unknown[]) => Promise<unknown>): ReadClient {
  return createPublicClient({
    transport: custom(
      {
        request: ({ method, params }: { method: string; params?: unknown }) =>
          request(method, (params ?? []) as unknown[]),
      },
      { retryCount: 0 },
    ),
  });
}

/** A JSON-RPC error object as a provider rejects with it. */
export function rpcError(code: number, message: string, data?: unknown): Error {
  return Object.assign(new Error(message), { code, data });
}
