import { isAddress, type Address, type Transport } from "viem";
import type { CourtChainId } from "./chains.ts";

/**
 * What the core needs to read a chain: its read RPC and the court's contract addresses. Core never reads
 * import.meta.env; the app builds this in src/env.ts from the same REACT_APP_* names as master, and the lab
 * builds it from a session.
 *
 * Exports and the screens that use them (spec = vault parity/02-behavioral-spec.md):
 * - CourtConfig, CourtContracts, ContractName: every core read (this piece) and the later pieces.
 * - readRpcUrl: readClient below; later the dynamic-script runner's per-chain RPC (02.1, 02.3.4).
 * - contractAddress: every core read; later the wallet actions (setStake 05.4, votes 07, deposit 05.9).
 */

/** Contract slots, named after master's env names (KLEROS_LIQUID*, KLEROS_LIQUID_EXTRA_VIEWS*, PINAKION*,
 * POLICY_REGISTRY*, RAW_PINAKION_XDAI). `pinakion` is PNK on Ethereum and stPNK (WrappedPinakion) on Gnosis;
 * `rawPinakion` is xPNK, Gnosis only. */
export type ContractName = "klerosLiquid" | "klerosLiquidExtraViews" | "pinakion" | "policyRegistry" | "rawPinakion";

export type CourtContracts = Readonly<Partial<Record<ContractName, string>>>;

export interface CourtConfig {
  /** Read RPC per chain id. Master's map (src/bootstrap/web3.js) is keyed by chain id, court chains or not. */
  readonly rpcUrls: Readonly<Partial<Record<number, string>>>;
  /** Contract addresses per Court V1 chain. */
  readonly contracts: Readonly<Partial<Record<CourtChainId, CourtContracts>>>;
  /** Transport for a chain's read RPC; default viem `http(url)`. Unit tests pass a viem `custom` transport. */
  readonly transport?: (rpcUrl: string, chainId: number) => Transport;
}

/**
 * The read RPC for a chain. A missing or empty setting throws `Unsupported chain ID: <id>`, as master's
 * getReadOnlyRpcUrl does (src/bootstrap/web3.js:36-43): never a public fallback.
 */
export function readRpcUrl(config: CourtConfig, chainId: number): string {
  const url = config.rpcUrls[chainId];
  if (!url) throw new Error(`Unsupported chain ID: ${chainId}`);
  return url;
}

/** A contract's address on a chain; throws when it is not configured or not an address. */
export function contractAddress(config: CourtConfig, chainId: CourtChainId, name: ContractName): Address {
  const value = config.contracts[chainId]?.[name];
  if (!value) throw new Error(`No ${name} address configured for chain ${chainId}`);
  if (!isAddress(value, { strict: false }))
    throw new Error(`The ${name} address for chain ${chainId} is not an address`);
  return value;
}
