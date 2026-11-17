import { custom, toFunctionSelector, type Hex, type Transport } from "viem";
import type { CourtConfig, CourtContracts } from "../config.ts";
import type { CourtChainId } from "../chains.ts";

// Test support only (no app code imports it). Answers are written out word by word from the contract source,
// never encoded with the ABIs under test, so a wrong ABI copy cannot agree with its own fixture.

export type Word = bigint | number | boolean | Hex;

/** One 32-byte ABI word: unsigned integers and booleans big-endian, addresses left-padded. */
export function word(value: Word): string {
  if (typeof value === "boolean") return value ? "1".padStart(64, "0") : "".padStart(64, "0");
  if (typeof value === "string") return value.slice(2).toLowerCase().padStart(64, "0");
  return BigInt(value).toString(16).padStart(64, "0");
}

export function words(...values: Word[]): Hex {
  return `0x${values.map(word).join("")}`;
}

/** An ABI-encoded `string` return value: offset 0x20, byte length, UTF-8 bytes right-padded to 32 bytes. */
export function stringResult(text: string): Hex {
  const bytes = Array.from(new TextEncoder().encode(text), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const padded = bytes.padEnd(Math.ceil(bytes.length / 64) * 64, "0");
  return `0x${word(0x20)}${word(bytes.length / 2)}${padded}`;
}

/** eth_call data: the selector of a signature written from the contract source, then the arguments as words. */
export function calldata(signature: string, ...args: Word[]): Hex {
  return `${toFunctionSelector(signature)}${args.map(word).join("")}`;
}

export interface Answer {
  readonly chainId: number;
  readonly to: Hex;
  readonly data: Hex;
  readonly result: Hex;
}

export interface Call {
  readonly chainId: number;
  readonly method: string;
  readonly to?: string;
  readonly data?: string;
}

/** A transport factory for CourtConfig.transport that answers eth_call from a fixed list and records every request. */
export function rpcFixture(answers: readonly Answer[]) {
  const calls: Call[] = [];
  const transport = (_url: string, chainId: number): Transport =>
    custom(
      {
        async request({ method, params }: { method: string; params?: unknown }) {
          const [tx] = (params ?? []) as [{ to?: string; data?: string }?];
          calls.push({ chainId, method, to: tx?.to, data: tx?.data });
          if (method !== "eth_call" || tx === undefined) throw new Error(`fixture: unexpected ${method}`);
          const answer = answers.find(
            (a) => a.chainId === chainId && a.to.toLowerCase() === tx.to?.toLowerCase() && a.data === tx.data,
          );
          if (answer === undefined) throw new Error(`fixture: no answer for ${tx.to} ${tx.data} on ${chainId}`);
          return answer.result;
        },
      },
      { retryCount: 0 },
    );
  return { transport, calls };
}

/** Made-up contract addresses, one set per chain, so a read against the wrong contract or chain finds no answer. */
export const addresses = {
  1: {
    klerosLiquid: "0x1000000000000000000000000000000000000001",
    klerosLiquidExtraViews: "0x1000000000000000000000000000000000000002",
    pinakion: "0x1000000000000000000000000000000000000003",
    policyRegistry: "0x1000000000000000000000000000000000000004",
  },
  100: {
    klerosLiquid: "0x6400000000000000000000000000000000000001",
    klerosLiquidExtraViews: "0x6400000000000000000000000000000000000002",
    pinakion: "0x6400000000000000000000000000000000000003",
    policyRegistry: "0x6400000000000000000000000000000000000004",
    rawPinakion: "0x6400000000000000000000000000000000000005",
  },
} as const satisfies Partial<Record<CourtChainId, CourtContracts>>;

/** A config for chains 1 and 100 on the fixture transport; the RPC URLs are never contacted. */
export function fixtureConfig(answers: readonly Answer[]): { config: CourtConfig; calls: Call[] } {
  const { transport, calls } = rpcFixture(answers);
  return {
    config: { rpcUrls: { 1: "http://rpc.invalid/1", 100: "http://rpc.invalid/100" }, contracts: addresses, transport },
    calls,
  };
}
