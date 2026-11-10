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
