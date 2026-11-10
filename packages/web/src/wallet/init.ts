import { createConfig, type Config } from "wagmi";
import type { CourtEnv } from "@court/core";
import { COURT_CHAINS } from "./chains";
import type { WalletModal } from "./connection";
import { ownTransports } from "./transports";

export interface WalletSetup {
  readonly config: Config;
  /** null = read-only: no project id, or AppKit failed to start. Nothing can connect; no Connect control. */
  readonly modal: WalletModal | null;
}

/** wagmi with no connectors and no EIP-6963 discovery: nothing can connect, nothing prompts. */
export function readOnlyWagmiConfig(env: CourtEnv): Config {
  return createConfig({
    chains: COURT_CHAINS,
    connectors: [],
    multiInjectedProviderDiscovery: false,
    transports: ownTransports(env),
  });
}

export async function initWallet(env: CourtEnv, origin: string): Promise<WalletSetup> {
  const projectId = env.walletConnectProjectId;
  if (projectId === undefined) return { config: readOnlyWagmiConfig(env), modal: null };
  try {
    const { startAppKit } = await import("./appkit");
    return startAppKit(projectId, env, origin);
  } catch (error) {
    console.error("Wallet connection unavailable; the app stays read-only.", error);
    return { config: readOnlyWagmiConfig(env), modal: null };
  }
}
