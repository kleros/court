import { createPublicClient, type PublicClient } from "viem";
import type { CourtChainId, CourtEnv } from "@court/core";
import { CHAIN_BY_ID } from "./chains";
import { ownTransport } from "./transports";

/**
 * Every chain read goes through these clients, never through wagmi's or Reown's (D-01). Offchain lookups (CCIP read)
 * are off: on that revert viem fetches URLs the called contract names, outside our transport and with no timeout.
 */
export function createReadClient(env: CourtEnv, chainId: CourtChainId): PublicClient {
  return createPublicClient({ chain: CHAIN_BY_ID[chainId], transport: ownTransport(env, chainId), ccipRead: false });
}
