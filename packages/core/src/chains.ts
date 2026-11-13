import type { AddEthereumChainParameter } from "viem";
import { gnosis } from "viem/chains";
import type { Hex } from "./kernel/index.ts";

/** Chains Kleros Court V1 runs on. Mainnet and Gnosis are listed in chain menus; the testnets stay reachable by URL and wallet. */
export const COURT_CHAIN_IDS = {
  mainnet: 1,
  gnosis: 100,
  sepolia: 11155111,
  chiado: 10200,
} as const;

export type CourtChainId = (typeof COURT_CHAIN_IDS)[keyof typeof COURT_CHAIN_IDS];

export const COURT_CHAIN_ID_LIST: readonly CourtChainId[] = Object.values(COURT_CHAIN_IDS);

export function isCourtChainId(value: unknown): value is CourtChainId {
  return typeof value === "number" && (COURT_CHAIN_ID_LIST as readonly number[]).includes(value);
}

export interface ChainInfo {
  /** Full name, as in "Switch to {name}" (spec 01.16). */
  readonly name: string;
  /** Short name, as on the network badge (spec 01.8, 01.16). */
  readonly shortName: string;
  /** Block explorer, no trailing slash (spec 01.16). */
  readonly explorer: string;
  /** Native currency symbol (spec 08.11). */
  readonly nativeSymbol: "ETH" | "xDAI" | "sETH";
  /** What staked PNK is called on this chain (spec 08.11). */
  readonly stakedSymbol: "PNK" | "stPNK";
  /** PNK bridged to Gnosis, called xPNK on every screen (P28; today some screens say "PNK"); null where none exists. */
  readonly bridgedSymbol: "xPNK" | null;
  /**
   * Sepolia and Chiado: reachable by URL and wallet but never offered in a chain menu (README 2026-11-04), and Buy PNK
   * and Convert say "not available on this chain" there (P60).
   */
  readonly testnet: boolean;
}

/** Names, explorers and symbols as today (spec 01.16, 08.11); xPNK named as in the glossary (P28). */
export const CHAIN_INFO: Readonly<Record<CourtChainId, ChainInfo>> = {
  [COURT_CHAIN_IDS.mainnet]: {
    name: "Ethereum Mainnet",
    shortName: "Mainnet",
    explorer: "https://etherscan.io",
    nativeSymbol: "ETH",
    stakedSymbol: "PNK",
    bridgedSymbol: null,
    testnet: false,
  },
  [COURT_CHAIN_IDS.gnosis]: {
    name: "Gnosis Chain",
    shortName: "Gnosis Chain",
    explorer: "https://gnosis.blockscout.com",
    nativeSymbol: "xDAI",
    stakedSymbol: "stPNK",
    bridgedSymbol: "xPNK",
    testnet: false,
  },
  [COURT_CHAIN_IDS.sepolia]: {
    name: "Ethereum Testnet Sepolia",
    shortName: "Sepolia",
    explorer: "https://sepolia.etherscan.io",
    nativeSymbol: "sETH",
    stakedSymbol: "PNK",
    bridgedSymbol: null,
    testnet: true,
  },
  [COURT_CHAIN_IDS.chiado]: {
    name: "Gnosis Testnet Chiado",
    shortName: "Chiado",
    explorer: "https://blockscout.chiadochain.net",
    nativeSymbol: "xDAI",
    stakedSymbol: "stPNK",
    bridgedSymbol: "xPNK",
    testnet: true,
  },
};

/** A chain that is not a court chain links to Mainnet's explorer, as today (spec 01.16). */
function explorerOf(chainId: number): string {
  return CHAIN_INFO[isCourtChainId(chainId) ? chainId : COURT_CHAIN_IDS.mainnet].explorer;
}

export function explorerAddressUrl(chainId: number, address: string): string {
  return `${explorerOf(chainId)}/address/${address}`;
}

export function explorerTxUrl(chainId: number, hash: Hex): string {
  return `${explorerOf(chainId)}/tx/${hash}`;
}

/**
 * What a chain switch sends with wallet_addEthereumChain when the wallet lacks the chain. Only Gnosis is ever added
 * (P53); any other chain gets null. Name, currency and explorer are today's (spec 05.10). The RPC is Gnosis's public
 * endpoint as viem lists it, never the app's own read RPC, so no keyed URL is written into a wallet (P19).
 */
export function addChainParameters(chainId: number): AddEthereumChainParameter | null {
  if (chainId !== COURT_CHAIN_IDS.gnosis) return null;
  const info = CHAIN_INFO[COURT_CHAIN_IDS.gnosis];
  return {
    chainId: "0x64",
    chainName: info.name,
    nativeCurrency: { name: info.nativeSymbol, symbol: info.nativeSymbol, decimals: 18 },
    rpcUrls: [...gnosis.rpcUrls.default.http],
    blockExplorerUrls: [info.explorer],
  };
}
