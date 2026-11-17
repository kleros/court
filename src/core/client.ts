import { createPublicClient, http, type PublicClient } from "viem";
import { readRpcUrl, type CourtConfig } from "./config.ts";

/**
 * One viem read client per config and chain, on the chain's configured read RPC.
 *
 * Exports and the screens that use them (spec = vault parity/02-behavioral-spec.md):
 * - readClient: every core read (court tree 05.1-05.5, juror 05.1-05.7, balances 05.7-05.10, token stats 05.12);
 *   later the case reads (06, 07).
 */

const clients = new WeakMap<CourtConfig, Map<number, PublicClient>>();

export function readClient(config: CourtConfig, chainId: number): PublicClient {
  let perChain = clients.get(config);
  if (perChain === undefined) {
    perChain = new Map();
    clients.set(config, perChain);
  }
  let client = perChain.get(chainId);
  if (client === undefined) {
    // Throws "Unsupported chain ID" before any transport exists: viem's http(undefined) would quietly use the
    // chain's public RPC.
    const url = readRpcUrl(config, chainId);
    client = createPublicClient({ transport: config.transport?.(url, chainId) ?? http(url) });
    perChain.set(chainId, client);
  }
  return client;
}
