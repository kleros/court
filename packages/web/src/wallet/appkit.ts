import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { OptionsController } from "@reown/appkit-controllers";
import { gnosis, gnosisChiado, mainnet, sepolia, type AppKitNetwork } from "@reown/appkit/networks";
import { KeyValueStorage } from "@walletconnect/keyvaluestorage";
import type UniversalProvider from "@walletconnect/universal-provider";
import { createStore, del, keys } from "idb-keyval";
import type { Config } from "wagmi";
import { createSafeStorage, isCourtChainId, type CourtEnv } from "@court/core";
import { browserLocalStorage } from "../storage";
import { APPKIT_FEATURES, APPKIT_THEME_VARIABLES, appMetadata, customRpcUrls } from "./appkitOptions";
import { EMBEDDED_WALLET_REFUSAL, isEmbeddedWalletConnector, type WalletModal } from "./connection";
import { ownTransports } from "./transports";
import {
  dropNamespacesWithoutSession,
  endDisconnectLocally,
  forgetAfterDisconnect,
  forgetBeforeRetry,
  startWalletConnect,
  type WalletConnectKeys,
} from "./walletConnectRecovery";
import type { WalletConnectStore } from "./walletConnectValues";
import { walletStorage } from "./walletStorage";

const NETWORKS: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, gnosis, sepolia, gnosisChiado];

/**
 * The URLs wagmi's chains lead with. A wagmi connector adds a network the wallet lacks from its chain's first URL when
 * no add parameters are passed, as on Connect (@wagmi/core injected.js:129-130, :342-346). Reads never use these URLs
 * (ownTransports), so each chain leads with the network's own public RPC, the one AppKit's Switch Network window adds:
 * never the app's read RPC, which can carry a key the wallet would keep, nor Reown's, whose URL carries the project id.
 */
const WAGMI_CHAIN_RPC_URLS = Object.fromEntries(
  NETWORKS.map((network) => [
    `eip155:${String(network.id)}`,
    network.rpcUrls.default.http.slice(0, 1).map((url) => ({ url })),
  ]),
);

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
    customRpcUrls: WAGMI_CHAIN_RPC_URLS,
    ssr: false,
    storage: walletStorage(),
    // The adapter passes this to wagmi's createConfig: its clients follow no offchain lookup (CCIP read), as ours.
    ccipRead: false,
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

/**
 * AppKit keeps a network the court does not run as its own after the wallet disconnects or locks there. When a wallet
 * then connected on a court network in the same page, AppKit opened its "Switch Network" window over the page instead
 * of taking that network (appkit-base-client.js:1345-1351), and picking a network in the window did not close it. So
 * whenever no wallet is connected, AppKit goes back to the first court network, as at a load (appkitStorage.ts).
 * "No wallet" by wagmi too: a wallet connecting on such a network gives AppKit that network a moment before AppKit
 * counts it connected (adapter-wagmi client.js:143-163), and AppKit must keep it then.
 */
function leaveUnsupportedNetworkWhenDisconnected(appKit: ReturnType<typeof createAppKit>, config: Config): void {
  appKit.subscribeAccount((account) => {
    const network = appKit.getCaipNetwork();
    const disconnected = account.status === "disconnected" && config.state.status === "disconnected";
    if (disconnected && network !== undefined && !isCourtChainId(Number(network.id))) {
      void appKit.switchNetwork(NETWORKS[0]);
    }
  }, "eip155");
}

/**
 * WalletConnect's store in the browser, as its core opens one each time AppKit starts it: IndexedDB, or localStorage
 * (memory when that is blocked too) when its move of WalletConnect's data into IndexedDB fails, as when the browser
 * refuses IndexedDB (@walletconnect/keyvaluestorage, patched in .yarn/patches). Here so that only the AppKit chunk loads
 * it.
 */
export const openWalletConnectStore = (): WalletConnectStore & WalletConnectKeys => new KeyValueStorage();

/**
 * WalletConnect's IndexedDB database, read as its store's browser build reads it (idb-keyval, with the database and
 * store names of @walletconnect/keyvaluestorage 1.1.1 dist/index.es.js) but without opening a store, which can move
 * WalletConnect's data (forgetAfterDisconnect). Text keys only, as that store lists them (patched in .yarn/patches):
 * WalletConnect writes no other.
 */
export function walletConnectDatabase(): WalletConnectKeys {
  const database = createStore("WALLET_CONNECT_V2_INDEXED_DB", "keyvaluestorage");
  return {
    getKeys: async () => (await keys(database)).filter((key) => typeof key === "string"),
    removeItem: (key) => del(key, database),
  };
}

/** AppKit's start of WalletConnect, run by the app: AppKit's `startUniversalProvider` option (patched in, see below). */
type StartWalletConnect = (init: () => Promise<UniversalProvider>) => Promise<UniversalProvider>;

/**
 * WalletConnect's start, for AppKit to run where it always started WalletConnect: `init` is AppKit's own start, with
 * its options and logger, so WalletConnect runs as AppKit starts it. AppKit alone keeps a start that fails for the
 * whole load (appkit-base-client.js:1587-1611), so a start that fails on saved data is run again without that data here
 * (walletConnectRecovery.ts); the provider gets the app's rules for namespaces kept with no session and for
 * Disconnect. AppKit 1.8.24 takes only a provider already started (`universalProvider`): the hook is a patch of
 * @reown/appkit in .yarn/patches.
 */
export function walletConnectStart(store: WalletConnectKeys): StartWalletConnect {
  const storage = createSafeStorage(browserLocalStorage);
  const database = walletConnectDatabase();
  return async (init) => {
    const provider = await startWalletConnect(init, () => forgetBeforeRetry(store, openWalletConnectStore, storage));
    dropNamespacesWithoutSession(provider);
    endDisconnectLocally(provider, () => forgetAfterDisconnect(store, database, storage));
    return provider;
  };
}

/**
 * Loaded only when a Reown project id is configured (wallet/init.ts). AppKit runs `startUniversalProvider` when it
 * starts WalletConnect; without one (WalletConnect's store did not answer boot's check) it starts WalletConnect itself.
 */
export function startAppKit(
  projectId: string,
  env: CourtEnv,
  origin: string,
  startUniversalProvider: StartWalletConnect | undefined,
): { config: Config; modal: WalletModal } {
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
    startUniversalProvider,
  });
  leaveUnsupportedNetworkWhenDisconnected(appKit, adapter.wagmiConfig);
  return { config: adapter.wagmiConfig, modal: connectModal(appKit) };
}
