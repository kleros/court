/**
 * The chains Court V1 runs on, their names and block explorers, as master has them
 * (src/helpers/networks.js, src/helpers/block-explorer.js).
 *
 * Exports and the screens that use them (spec = vault parity/02-behavioral-spec.md):
 * - courtChainIds, isCourtChainId: chain in the URL and the wallet's chain (01.6 routes, 01.7 chain gate).
 * - chainName: "Switch to {name}" modal and its button (01.7, 05.10), "Court on {name}" offers (05.10),
 *   "does not exist on {name}" on the case page (06.3).
 * - chainShortName: network badge (01.8) and the unsupported-chain fallback list (01.4).
 * - explorerAddressUrl: address links (01.16 EthAddress, 06.8 evidence submitter).
 * - explorerTransactionUrl: "View details" on transaction steps (05.9).
 * - explorerBaseUrl: Gnosis blockExplorerUrls in the add-chain request (05.10).
 */

/** Master's supportedChainIds order (Object.keys of a numeric-keyed object: ascending). */
export const courtChainIds = [1, 100, 10200, 11155111] as const;

export type CourtChainId = (typeof courtChainIds)[number];

export function isCourtChainId(chainId: number): chainId is CourtChainId {
  return (courtChainIds as readonly number[]).includes(chainId);
}

/** master src/helpers/networks.js chainIdToNetworkName */
const names: Record<CourtChainId, string> = {
  1: "Ethereum Mainnet",
  100: "Gnosis Chain",
  10200: "Gnosis Testnet Chiado",
  11155111: "Ethereum Testnet Sepolia",
};

/** master src/helpers/networks.js chainIdToNetworkShortName */
const shortNames: Record<CourtChainId, string> = {
  1: "Mainnet",
  100: "Gnosis Chain",
  10200: "Chiado",
  11155111: "Sepolia",
};

export function chainName(chainId: CourtChainId): string {
  return names[chainId];
}

export function chainShortName(chainId: CourtChainId): string {
  return shortNames[chainId];
}

/** master src/helpers/block-explorer.js chainIdToBaseUrl */
const explorers: Record<CourtChainId, string> = {
  1: "https://etherscan.io",
  100: "https://gnosis.blockscout.com",
  10200: "https://blockscout.chiadochain.net",
  11155111: "https://sepolia.etherscan.io",
};

/** Any other chain gets Etherscan, as on master (`?? chainIdToBaseUrl[1]`). */
export function explorerBaseUrl(chainId: number): string {
  return isCourtChainId(chainId) ? explorers[chainId] : explorers[1];
}

export function explorerAddressUrl(chainId: number, address: string): string {
  return `${explorerBaseUrl(chainId)}/address/${address}`;
}

export function explorerTransactionUrl(chainId: number, txHash: string): string {
  return `${explorerBaseUrl(chainId)}/tx/${txHash}`;
}
