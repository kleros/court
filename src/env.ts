import type { CourtConfig } from "./core/config.ts";

/** A setting from .env, or undefined when it is missing or blank. */
function setting(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

/** Build-time settings, under the same names as the current app. */
export const env = {
  walletConnectProjectId: setting(import.meta.env.REACT_APP_WALLETCONNECT_PROJECT_ID),
  rpcUrls: {
    1: setting(import.meta.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL),
    100: setting(import.meta.env.REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL),
    11155111: setting(import.meta.env.REACT_APP_WEB3_FALLBACK_SEPOLIA_HTTPS_URL),
    10200: setting(import.meta.env.REACT_APP_WEB3_FALLBACK_CHIADO_HTTPS_URL),
  },
} as const;

/**
 * What the core reads with: the read RPCs above and the contract addresses master binds per chain
 * (src/bootstrap/drizzle.js, src/api/side-chain/create-side-chain-api.js). A missing setting is left out here;
 * the read that needs it fails then (core/config.ts), as master's getReadOnlyRpcUrl does for RPCs. The display
 * subgraph URLs are master's displaySubgraph (src/bootstrap/subgraph.js); a missing one fails its query
 * (core/subgraph.ts).
 */
export const courtConfig: CourtConfig = {
  rpcUrls: env.rpcUrls,
  displaySubgraphUrls: {
    1: setting(import.meta.env.REACT_APP_SUBGRAPH_MAINNET_DISPLAY),
    100: setting(import.meta.env.REACT_APP_SUBGRAPH_GNOSIS_DISPLAY),
    10200: setting(import.meta.env.REACT_APP_SUBGRAPH_CHIADO_DISPLAY),
    11155111: setting(import.meta.env.REACT_APP_SUBGRAPH_SEPOLIA_DISPLAY),
  },
  contracts: {
    1: {
      klerosLiquid: setting(import.meta.env.REACT_APP_KLEROS_LIQUID_ADDRESS),
      klerosLiquidExtraViews: setting(import.meta.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ADDRESS),
      pinakion: setting(import.meta.env.REACT_APP_PINAKION_ADDRESS),
      policyRegistry: setting(import.meta.env.REACT_APP_POLICY_REGISTRY_ADDRESS),
    },
    100: {
      klerosLiquid: setting(import.meta.env.REACT_APP_KLEROS_LIQUID_XDAI_ADDRESS),
      klerosLiquidExtraViews: setting(import.meta.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_XDAI_ADDRESS),
      pinakion: setting(import.meta.env.REACT_APP_PINAKION_XDAI_ADDRESS),
      policyRegistry: setting(import.meta.env.REACT_APP_POLICY_REGISTRY_XDAI_ADDRESS),
      rawPinakion: setting(import.meta.env.REACT_APP_RAW_PINAKION_XDAI_ADDRESS),
    },
    10200: {
      klerosLiquid: setting(import.meta.env.REACT_APP_KLEROS_LIQUID_CHIADO_ADDRESS),
      klerosLiquidExtraViews: setting(import.meta.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_CHIADO_ADDRESS),
      pinakion: setting(import.meta.env.REACT_APP_PINAKION_CHIADO_ADDRESS),
      policyRegistry: setting(import.meta.env.REACT_APP_POLICY_REGISTRY_CHIADO_ADDRESS),
    },
    11155111: {
      klerosLiquid: setting(import.meta.env.REACT_APP_KLEROS_LIQUID_SEPOLIA_ADDRESS),
      klerosLiquidExtraViews: setting(import.meta.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_SEPOLIA_ADDRESS),
      pinakion: setting(import.meta.env.REACT_APP_PINAKION_SEPOLIA_ADDRESS),
      policyRegistry: setting(import.meta.env.REACT_APP_POLICY_REGISTRY_SEPOLIA_ADDRESS),
    },
  },
};
