import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { gnosis, gnosisChiado, mainnet, sepolia, type AppKitNetwork } from "@reown/appkit/networks";
import type { Config } from "wagmi";
import type { CourtEnv } from "@court/core";
import { APPKIT_FEATURES, APPKIT_THEME_VARIABLES, appMetadata, customRpcUrls } from "./appkitOptions";
import { ownTransports } from "./transports";

const NETWORKS: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, gnosis, sepolia, gnosisChiado];

export function createWagmiAdapter(projectId: string, env: CourtEnv): WagmiAdapter {
  return new WagmiAdapter({
    projectId,
    networks: NETWORKS,
    transports: ownTransports(env),
    customRpcUrls: customRpcUrls(env),
    ssr: false,
  });
}

/** Loaded only when a Reown project id is configured (wallet/init.ts). */
export function startAppKit(projectId: string, env: CourtEnv, origin: string): Config {
  const adapter = createWagmiAdapter(projectId, env);
  createAppKit({
    adapters: [adapter],
    networks: NETWORKS,
    projectId,
    metadata: appMetadata(origin),
    features: { ...APPKIT_FEATURES },
    themeVariables: APPKIT_THEME_VARIABLES,
    customRpcUrls: customRpcUrls(env),
    enableCoinbase: false,
  });
  return adapter.wagmiConfig;
}
