import { createConfig, type Config } from "wagmi";
import type { CourtEnv } from "@court/core";
import { COURT_CHAINS } from "./chains";
import { ownTransports } from "./transports";

export interface WalletSetup {
  readonly config: Config;
  /** false = read-only: no project id, or AppKit failed to start. Nothing can connect. */
  readonly canConnect: boolean;
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
  if (projectId === undefined) return { config: readOnlyWagmiConfig(env), canConnect: false };
  try {
    const { startAppKit } = await import("./appkit");
    return { config: startAppKit(projectId, env, origin), canConnect: true };
  } catch (error) {
    console.error("Wallet connection unavailable; the app stays read-only.", error);
    return { config: readOnlyWagmiConfig(env), canConnect: false };
  }
}
