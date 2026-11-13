import { createConfig, type Config } from "wagmi";
import { createSafeStorage, type CourtEnv } from "@court/core";
import { browserLocalStorage } from "../storage";
import { dropUnusableAppKitValues } from "./appkitStorage";
import { COURT_CHAINS } from "./chains";
import type { WalletModal } from "./connection";
import { ownTransports } from "./transports";
import { dropUnusableWalletConnectValues } from "./walletConnectValues";
import { walletStorage } from "./walletStorage";

export interface WalletSetup {
  readonly config: Config;
  /** null = read-only: no project id, or AppKit failed to start. Nothing can connect; no Connect control. */
  readonly modal: WalletModal | null;
}

/**
 * wagmi with no connectors and no EIP-6963 discovery: nothing can connect, nothing prompts. Its clients follow no
 * offchain lookup (CCIP read), as our read clients (readClients.ts).
 */
export function readOnlyWagmiConfig(env: CourtEnv): Config {
  return createConfig({
    chains: COURT_CHAINS,
    connectors: [],
    multiInjectedProviderDiscovery: false,
    storage: walletStorage(),
    transports: ownTransports(env),
    ccipRead: false,
  });
}

export async function initWallet(env: CourtEnv, origin: string): Promise<WalletSetup> {
  const projectId = env.walletConnectProjectId;
  if (projectId === undefined) return { config: readOnlyWagmiConfig(env), modal: null };
  // Before AppKit's modules load, so nothing of AppKit has read its stored values yet.
  dropUnusableAppKitValues(createSafeStorage(browserLocalStorage));
  try {
    const { openWalletConnectStore, startAppKit, walletConnectStart } = await import("./appkit");
    const store = openWalletConnectStore();
    // WalletConnect reads its stored records once, when AppKit starts it. AppKit starts it with the app's start, which
    // starts it again when its saved data makes it fail; but a store that did not answer in time will not answer that
    // start either, nor the forgetting of its data: AppKit then starts WalletConnect itself, as it always did.
    const answered = await dropUnusableWalletConnectValues(store);
    return startAppKit(projectId, env, origin, answered ? walletConnectStart(store) : undefined);
  } catch (error) {
    console.error("Wallet connection unavailable; the app stays read-only.", error);
    return { config: readOnlyWagmiConfig(env), modal: null };
  }
}
