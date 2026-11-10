import { COURT_CHAIN_IDS, type CourtChainId } from "./chains.ts";

/**
 * Every environment variable the app reads. Names are the production Netlify names (REACT_APP_*), so the
 * dashboard values reach the new app unchanged. `.env.example` lists exactly these keys (a test checks it).
 */

/** Read RPC per chain. Court chains: the app's own reads. Other chains: only the dynamic-script runner's RPC redirect. */
export const RPC_URL_KEYS = {
  1: "REACT_APP_WEB3_FALLBACK_HTTPS_URL",
  10: "REACT_APP_WEB3_FALLBACK_OPTIMISM_HTTPS_URL",
  100: "REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL",
  130: "REACT_APP_WEB3_FALLBACK_UNICHAIN_HTTPS_URL",
  137: "REACT_APP_WEB3_FALLBACK_POLYGON_HTTPS_URL",
  300: "REACT_APP_WEB3_FALLBACK_ZKSYNCSEPOLIA_HTTPS_URL",
  324: "REACT_APP_WEB3_FALLBACK_ZKSYNC_HTTPS_URL",
  690: "REACT_APP_WEB3_FALLBACK_REDSTONE_HTTPS_URL",
  1301: "REACT_APP_WEB3_FALLBACK_UNICHAINSEPOLIA_HTTPS_URL",
  10200: "REACT_APP_WEB3_FALLBACK_CHIADO_HTTPS_URL",
  80001: "REACT_APP_WEB3_FALLBACK_MUMBAI_HTTPS_URL",
  42161: "REACT_APP_WEB3_FALLBACK_ARBITRUM_HTTPS_URL",
  421614: "REACT_APP_WEB3_FALLBACK_ARBITRUMSEPOLIA_HTTPS_URL",
  11155111: "REACT_APP_WEB3_FALLBACK_SEPOLIA_HTTPS_URL",
  11155420: "REACT_APP_WEB3_FALLBACK_OPTIMISMSEPOLIA_HTTPS_URL",
  8453: "REACT_APP_WEB3_FALLBACK_BASE_HTTPS_URL",
  84532: "REACT_APP_WEB3_FALLBACK_BASE_SEPOLIA_HTTPS_URL",
} as const;

export const SUBGRAPH_URL_KEYS: Record<CourtChainId, string> = {
  [COURT_CHAIN_IDS.mainnet]: "REACT_APP_SUBGRAPH_MAINNET_DISPLAY",
  [COURT_CHAIN_IDS.gnosis]: "REACT_APP_SUBGRAPH_GNOSIS_DISPLAY",
  [COURT_CHAIN_IDS.sepolia]: "REACT_APP_SUBGRAPH_SEPOLIA_DISPLAY",
  [COURT_CHAIN_IDS.chiado]: "REACT_APP_SUBGRAPH_CHIADO_DISPLAY",
};

/** Contract addresses and deploy blocks, per chain, with today's names. */
export const CONTRACT_KEYS: Record<CourtChainId, Readonly<Record<string, string>>> = {
  [COURT_CHAIN_IDS.mainnet]: {
    klerosLiquid: "REACT_APP_KLEROS_LIQUID_ADDRESS",
    klerosLiquidExtraViews: "REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ADDRESS",
    klerosLiquidBlockNumber: "REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER",
    pinakion: "REACT_APP_PINAKION_ADDRESS",
    policyRegistry: "REACT_APP_POLICY_REGISTRY_ADDRESS",
    uniswapV2Factory: "REACT_APP_UNISWAP_V2_FACTORY_ADDRESS",
    uniswapV2Router02: "REACT_APP_UNISWAP_V2_ROUTER_02_ADDRESS",
  },
  [COURT_CHAIN_IDS.gnosis]: {
    klerosLiquid: "REACT_APP_KLEROS_LIQUID_XDAI_ADDRESS",
    klerosLiquidExtraViews: "REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_XDAI_ADDRESS",
    klerosLiquidBlockNumber: "REACT_APP_KLEROS_LIQUID_XDAI_BLOCK_NUMBER",
    pinakion: "REACT_APP_PINAKION_XDAI_ADDRESS",
    rawPinakion: "REACT_APP_RAW_PINAKION_XDAI_ADDRESS",
    policyRegistry: "REACT_APP_POLICY_REGISTRY_XDAI_ADDRESS",
    tokenBridge: "REACT_APP_TOKEN_BRIDGE_XDAI_ADDRESS",
    uniswapV2Factory: "REACT_APP_UNISWAP_V2_FACTORY_XDAI_ADDRESS",
    uniswapV2Router02: "REACT_APP_UNISWAP_V2_ROUTER_02_XDAI_ADDRESS",
  },
  [COURT_CHAIN_IDS.sepolia]: {
    klerosLiquid: "REACT_APP_KLEROS_LIQUID_SEPOLIA_ADDRESS",
    klerosLiquidExtraViews: "REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_SEPOLIA_ADDRESS",
    klerosLiquidBlockNumber: "REACT_APP_KLEROS_LIQUID_SEPOLIA_BLOCK_NUMBER",
    pinakion: "REACT_APP_PINAKION_SEPOLIA_ADDRESS",
    policyRegistry: "REACT_APP_POLICY_REGISTRY_SEPOLIA_ADDRESS",
  },
  [COURT_CHAIN_IDS.chiado]: {
    klerosLiquid: "REACT_APP_KLEROS_LIQUID_CHIADO_ADDRESS",
    klerosLiquidExtraViews: "REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_CHIADO_ADDRESS",
    klerosLiquidBlockNumber: "REACT_APP_KLEROS_LIQUID_CHIADO_BLOCK_NUMBER",
    pinakion: "REACT_APP_PINAKION_CHIADO_ADDRESS",
    policyRegistry: "REACT_APP_POLICY_REGISTRY_CHIADO_ADDRESS",
  },
};

export const SERVICE_KEYS = {
  metaEvidenceUrl: "REACT_APP_METAEVIDENCE_URL",
  justificationsUrl: "REACT_APP_JUSTIFICATIONS_URL",
  atlasUri: "REACT_APP_ATLAS_URI",
  ipfsGateway: "REACT_APP_IPFS_GATEWAY",
  walletConnectProjectId: "REACT_APP_WALLETCONNECT_PROJECT_ID",
  sentryDsn: "REACT_APP_SENTRY_ENDPOINT",
  context: "REACT_APP_CONTEXT",
} as const;

export const ENV_KEYS: readonly string[] = [
  ...Object.values(RPC_URL_KEYS),
  ...Object.values(SUBGRAPH_URL_KEYS),
  ...Object.values(CONTRACT_KEYS).flatMap((keys) => Object.values(keys)),
  ...Object.values(SERVICE_KEYS),
];

/** Today's gateway (court src/utils/ipfs.js:1); the variable only overrides it (e.g. the lab). */
export const DEFAULT_IPFS_GATEWAY = "https://cdn.kleros.link";

export type RawEnv = Readonly<Record<string, unknown>>;

export interface CourtEnv {
  /** Read RPC per chain id, every chain in RPC_URL_KEYS. */
  readonly rpcUrls: Readonly<Partial<Record<number, string>>>;
  readonly subgraphUrls: Readonly<Partial<Record<CourtChainId, string>>>;
  readonly contracts: Readonly<Record<CourtChainId, Readonly<Partial<Record<string, string>>>>>;
  readonly metaEvidenceUrl: string | undefined;
  readonly justificationsUrl: string | undefined;
  readonly atlasUri: string | undefined;
  readonly ipfsGateway: string;
  /** Unset = no wallet connection at all: the app stays read-only. */
  readonly walletConnectProjectId: string | undefined;
  /** Unset = Sentry off. */
  readonly sentryDsn: string | undefined;
  readonly context: string | undefined;
}

function value(raw: RawEnv, key: string): string | undefined {
  const v = raw[key];
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? undefined : trimmed;
}

function definedEntries<K extends PropertyKey>(entries: [K, string | undefined][]): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const [k, v] of entries) if (v !== undefined) out[k] = v;
  return out;
}

export function readEnv(raw: RawEnv): CourtEnv {
  const contractsFor = (chainId: CourtChainId): Partial<Record<string, string>> =>
    definedEntries(Object.entries(CONTRACT_KEYS[chainId]).map(([name, key]) => [name, value(raw, key)]));
  return {
    rpcUrls: definedEntries(Object.entries(RPC_URL_KEYS).map(([id, key]) => [Number(id), value(raw, key)])),
    subgraphUrls: definedEntries(
      Object.entries(SUBGRAPH_URL_KEYS).map(([id, key]) => [Number(id) as CourtChainId, value(raw, key)]),
    ),
    contracts: {
      [COURT_CHAIN_IDS.mainnet]: contractsFor(COURT_CHAIN_IDS.mainnet),
      [COURT_CHAIN_IDS.gnosis]: contractsFor(COURT_CHAIN_IDS.gnosis),
      [COURT_CHAIN_IDS.sepolia]: contractsFor(COURT_CHAIN_IDS.sepolia),
      [COURT_CHAIN_IDS.chiado]: contractsFor(COURT_CHAIN_IDS.chiado),
    },
    metaEvidenceUrl: value(raw, SERVICE_KEYS.metaEvidenceUrl),
    justificationsUrl: value(raw, SERVICE_KEYS.justificationsUrl),
    atlasUri: value(raw, SERVICE_KEYS.atlasUri),
    ipfsGateway: value(raw, SERVICE_KEYS.ipfsGateway) ?? DEFAULT_IPFS_GATEWAY,
    walletConnectProjectId: value(raw, SERVICE_KEYS.walletConnectProjectId),
    sentryDsn: value(raw, SERVICE_KEYS.sentryDsn),
    context: value(raw, SERVICE_KEYS.context),
  };
}
