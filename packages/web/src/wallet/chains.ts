import { gnosis, gnosisChiado, mainnet, sepolia, type Chain } from "viem/chains";
import { COURT_CHAIN_IDS, type CourtChainId } from "@court/core";

export const COURT_CHAINS = [mainnet, gnosis, sepolia, gnosisChiado] as const satisfies readonly [Chain, ...Chain[]];

export const CHAIN_BY_ID: Readonly<Record<CourtChainId, Chain>> = {
  [COURT_CHAIN_IDS.mainnet]: mainnet,
  [COURT_CHAIN_IDS.gnosis]: gnosis,
  [COURT_CHAIN_IDS.sepolia]: sepolia,
  [COURT_CHAIN_IDS.chiado]: gnosisChiado,
};
