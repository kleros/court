import { custom, http, type Transport } from "viem";
import { COURT_CHAIN_ID_LIST, type CourtChainId, type CourtEnv } from "@court/core";

/**
 * The app's own read transport per chain, from the configured RPC URL only. A chain without a URL gets a transport
 * that fails: it never falls back to a public or Reown endpoint (03 DEC-REOWN).
 */
export function ownTransport(env: CourtEnv, chainId: CourtChainId): Transport {
  const url = env.rpcUrls[chainId];
  if (url !== undefined) return http(url);
  return custom({
    request: () => Promise.reject(new Error(`No read RPC configured for chain ${String(chainId)}`)),
  });
}

export function ownTransports(env: CourtEnv): Record<CourtChainId, Transport> {
  return Object.fromEntries(COURT_CHAIN_ID_LIST.map((id) => [id, ownTransport(env, id)])) as Record<
    CourtChainId,
    Transport
  >;
}
