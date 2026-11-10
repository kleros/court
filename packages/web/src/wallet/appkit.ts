import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { OptionsController } from "@reown/appkit-controllers";
import { gnosis, gnosisChiado, mainnet, sepolia, type AppKitNetwork } from "@reown/appkit/networks";
import type { Config } from "wagmi";
import type { CourtEnv } from "@court/core";
import { APPKIT_FEATURES, APPKIT_THEME_VARIABLES, appMetadata, customRpcUrls } from "./appkitOptions";
import { EMBEDDED_WALLET_REFUSAL, isEmbeddedWalletConnector, type WalletModal } from "./connection";
import { ownTransports } from "./transports";

const NETWORKS: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, gnosis, sepolia, gnosisChiado];

export function createWagmiAdapter(projectId: string, env: CourtEnv): WagmiAdapter {
  // No Base Account (Coinbase smart wallet) connector: its SDK injects an inline script, which our CSP blocks (a
  // violation on every load, D-03 wants none), and posts telemetry to cca-lite.coinbase.com. The adapter adds it unless
  // this flag is false (adapter-wagmi client.js:169-176). AppKit 1.8.24 declares an enableBaseAccount option but never
  // copies it here (appkit-base-client.js:416-468 sets enableCoinbase only), so the app sets it before AppKit syncs the
  // adapter's connectors. An AppKit upgrade that turns it back on fails the end-to-end CSP tests on the wallet build.
  OptionsController.setEnableBaseAccount(false);
  return new WagmiAdapter({
    projectId,
    networks: NETWORKS,
    transports: ownTransports(env),
    customRpcUrls: customRpcUrls(env),
    ssr: false,
  });
}

/**
 * The Connect view, as the Dispute Resolver opens it. Waits for AppKit's start (its remote config can turn email and
 * socials back on) and refuses when that registered the embedded wallet, so no click opens a Connect view offering it.
 */
export function connectModal(appKit: {
  ready(): Promise<void>;
  getConnectors(): readonly { readonly id: string; readonly type: string }[];
  open(options: { view: "Connect" }): Promise<unknown>;
}): WalletModal {
  return {
    async openConnect() {
      await appKit.ready();
      if (appKit.getConnectors().some(isEmbeddedWalletConnector)) throw new Error(EMBEDDED_WALLET_REFUSAL);
      await appKit.open({ view: "Connect" });
    },
  };
}

/** Loaded only when a Reown project id is configured (wallet/init.ts). */
export function startAppKit(projectId: string, env: CourtEnv, origin: string): { config: Config; modal: WalletModal } {
  const adapter = createWagmiAdapter(projectId, env);
  const appKit = createAppKit({
    adapters: [adapter],
    networks: NETWORKS,
    projectId,
    metadata: appMetadata(origin),
    features: { ...APPKIT_FEATURES },
    themeVariables: APPKIT_THEME_VARIABLES,
    customRpcUrls: customRpcUrls(env),
    enableCoinbase: false,
  });
  return { config: adapter.wagmiConfig, modal: connectModal(appKit) };
}
