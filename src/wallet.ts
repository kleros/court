import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { gnosis, gnosisChiado, mainnet, sepolia, type AppKitNetwork } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { createConfig, http, type Config } from "wagmi";
import { env } from "./env";

/** The chains Court V1 runs on: Ethereum and Gnosis, plus their testnets. */
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, gnosis, sepolia, gnosisChiado];

/** Our RPC where one is configured; otherwise the chain's default. */
const transports = {
  [mainnet.id]: http(env.rpcUrls[1]),
  [gnosis.id]: http(env.rpcUrls[100]),
  [sepolia.id]: http(env.rpcUrls[11155111]),
  [gnosisChiado.id]: http(env.rpcUrls[10200]),
};

export interface Wallet {
  readonly config: Config;
  /** False without a Reown project id: the app can read, but nothing can connect. */
  readonly canConnect: boolean;
}

export function readOnlyWallet(): Wallet {
  return { config: createConfig({ chains: [mainnet, gnosis, sepolia, gnosisChiado], transports }), canConnect: false };
}

/** Reown AppKit with its wagmi adapter, set up as Reown documents it. */
export function createWallet(origin: string): Wallet {
  const projectId = env.walletConnectProjectId;
  if (projectId === undefined) return readOnlyWallet();
  const wagmiAdapter = new WagmiAdapter({ projectId, networks, transports, ssr: false });
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata: {
      name: "Kleros Court",
      description: "Kleros Court",
      url: origin,
      icons: [`${origin}/icon-192.png`],
    },
  });
  return { config: wagmiAdapter.wagmiConfig, canConnect: true };
}
