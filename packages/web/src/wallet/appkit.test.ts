import "./testing/refusedRelay";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ChainController, ConnectionController, ModalController, RouterController } from "@reown/appkit-controllers";
import { gnosis, gnosisChiado, mainnet, sepolia } from "@reown/appkit/networks";
import type { Config } from "wagmi";
import { readEnv } from "@court/core";
import { openWalletConnectStore, startAppKit } from "./appkit";
import {
  WAIT,
  accountStatus,
  activeNetwork,
  announceWallet,
  connectInAppKit,
  hex,
  leaveAppKitOn,
} from "./testing/fakeWallet";

/*
 * AppKit as the page starts it, with a browser wallet announced the EIP-6963 way, connected and moved the way a user
 * does it. One AppKit for the whole file: its controllers are module singletons. Unit tests make no network requests:
 * Reown's remote config fails and AppKit starts with the local options; WalletConnect's relay is refused.
 */

const POLYGON = 137;

/** The app's own read RPC per chain, as the build environment sets it (in production the URL carries a key). */
const OWN_RPC = {
  [mainnet.id]: "https://own-rpc.example/v2/OWN-KEY-1",
  [gnosis.id]: "https://own-rpc.example/v2/OWN-KEY-100",
  [sepolia.id]: "https://own-rpc.example/v2/OWN-KEY-11155111",
  [gnosisChiado.id]: "https://own-rpc.example/v2/OWN-KEY-10200",
};
const ENV = readEnv({
  REACT_APP_WALLETCONNECT_PROJECT_ID: "00000000000000000000000000000000",
  REACT_APP_WEB3_FALLBACK_HTTPS_URL: OWN_RPC[mainnet.id],
  REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL: OWN_RPC[gnosis.id],
  REACT_APP_WEB3_FALLBACK_SEPOLIA_HTTPS_URL: OWN_RPC[sepolia.id],
  REACT_APP_WEB3_FALLBACK_CHIADO_HTTPS_URL: OWN_RPC[gnosisChiado.id],
});
/** Each network's own public RPC, as viem lists it: what a wallet that lacks the network is given. */
const PUBLIC_RPC: Readonly<Record<number, string | undefined>> = Object.fromEntries(
  [mainnet, gnosis, sepolia, gnosisChiado].map((network) => [network.id, network.rpcUrls.default.http[0]]),
);

let wallet: ReturnType<typeof announceWallet>;
let config: Config;

const settle = () => new Promise((resolve) => setTimeout(resolve, 300));
const switchWindowOpen = () => ModalController.state.open && RouterController.state.view === "UnsupportedChain";
/** Every URL the page fetched (unit tests answer none). */
const fetched: string[] = [];

/** The wallet moves to Polygon, which the court does not run: AppKit's "Switch Network" window opens, as it should. */
async function moveToPolygon(): Promise<void> {
  wallet.moveTo(POLYGON);
  await vi.waitFor(() => {
    expect(switchWindowOpen()).toBe(true);
    expect(activeNetwork()).toBe(`eip155:${String(POLYGON)}`);
  }, WAIT);
}

beforeAll(async () => {
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    fetched.push(input instanceof Request ? input.url : String(input));
    return Promise.reject(new Error("unit tests make no network requests"));
  });
  // jsdom has none; AppKit's window uses it once it opens.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = () => undefined;
      unobserve = () => undefined;
      disconnect = () => undefined;
    },
  );
  localStorage.clear();
  wallet = announceWallet();
  // No provider handed over: AppKit starts WalletConnect itself, as it does when the app could not.
  ({ config } = startAppKit(ENV.walletConnectProjectId ?? "", ENV, "https://court.example", undefined));
  await connectInAppKit();
});

afterAll(() => {
  wallet.stop();
  ModalController.close();
  vi.unstubAllGlobals();
});

describe("a network the wallet lacks", () => {
  // AppKit's own "Switch Network" window and appKit.switchNetwork both end here (scaffold-ui
  // w3m-unsupported-chain-view/index.js:122-135, w3m-network-switch-view/index.js:114; appkit-base-client.js:1764-1771).
  it.each([gnosis, sepolia, gnosisChiado, mainnet])(
    "is added with its public RPC, never the app's read RPC: $name",
    async (network) => {
      wallet.forget(network.id);
      const target = ChainController.getCaipNetworks().find((n) => n.id === network.id);
      if (target === undefined) throw new Error(`${network.name} is not an AppKit network`);
      const before = wallet.added.length;
      await ChainController.switchActiveNetwork(target, { throwOnFailure: true });
      expect(wallet.added.slice(before)).toEqual([
        expect.objectContaining({ chainId: hex(network.id), rpcUrls: [network.rpcUrls.default.http[0]] }),
      ]);
      expect(JSON.stringify(wallet.added)).not.toContain("own-rpc.example");
    },
  );

  // A WalletConnect wallet adds the network from the same field of AppKit's networks (adapter-wagmi
  // WalletConnectConnector.js:243). AppKit's own calls (the WalletConnect RPC map) keep the app's RPC first.
  it("is added from AppKit's networks with only the public RPC, while AppKit's own calls keep the app's first", () => {
    const networks = ChainController.getCaipNetworks();
    expect(networks).toHaveLength(4);
    for (const network of networks) {
      expect(network.rpcUrls.chainDefault?.http, network.name).toEqual([PUBLIC_RPC[Number(network.id)]]);
      expect(network.rpcUrls.default.http[0], network.name).toBe(OWN_RPC[network.id as keyof typeof OWN_RPC]);
    }
  });

  // wagmi's connectors add a network from wagmi's chain (@wagmi/core injected.js:342-346); reads use the app's
  // transports, never these URLs.
  it("is added from wagmi's chains, which lead with the public RPC and hold none of the app's", () => {
    expect(config.chains).toHaveLength(4);
    for (const chain of config.chains) {
      expect(chain.rpcUrls.default.http[0], chain.name).toBe(PUBLIC_RPC[chain.id]);
      expect(JSON.stringify(chain.rpcUrls), chain.name).not.toContain("own-rpc.example");
    }
  });
});

// Connect asks the wallet for AppKit's network (appkit-base-client.js:852-861); a wallet that lacks it gets an
// add-network request from wagmi's chain (@wagmi/core injected.js:129-130, :342-346), not from AppKit's network.
describe("Connect while AppKit is on a network the wallet lacks", () => {
  afterAll(async () => {
    wallet.moveTo(mainnet.id);
    await vi.waitFor(() => {
      expect(activeNetwork()).toBe("eip155:1");
    }, WAIT);
  });

  it.each([gnosis, sepolia, gnosisChiado])(
    "adds it with its public RPC, never the app's read RPC: $name",
    async (network) => {
      await leaveAppKitOn(wallet, network.id);
      const before = wallet.added.length;
      await connectInAppKit();
      expect(wallet.added.slice(before)).toEqual([
        expect.objectContaining({ chainId: hex(network.id), rpcUrls: [network.rpcUrls.default.http[0]] }),
      ]);
      expect(JSON.stringify(wallet.added)).not.toContain("own-rpc.example");
      expect(activeNetwork()).toBe(`eip155:${String(network.id)}`);
    },
  );
});

// AppKit kept a network the court does not run as its own after the wallet disconnected or locked there; when the
// wallet then connected on Ethereum in the same page, AppKit opened its "Switch Network" window ("This app doesn't
// support your current network") over the page, and picking Ethereum did not close it.
describe("a wallet that left a network the court does not run", () => {
  it("connects again on Ethereum after a disconnect, with no Switch Network window", async () => {
    await moveToPolygon();
    // The window's own Disconnect (w3m-unsupported-chain-view).
    await ConnectionController.disconnect();
    await vi.waitFor(() => {
      expect(accountStatus()).toBe("disconnected");
    }, WAIT);
    wallet.moveTo(mainnet.id);
    await connectInAppKit();
    await vi.waitFor(() => {
      expect(activeNetwork()).toBe("eip155:1");
    }, WAIT);
    await settle();
    expect(switchWindowOpen()).toBe(false);
  });

  it("connects again on Ethereum after the wallet locked and unlocked, with no Switch Network window", async () => {
    await moveToPolygon();
    wallet.lock();
    await vi.waitFor(() => {
      expect(accountStatus()).toBe("disconnected");
    }, WAIT);
    wallet.moveTo(mainnet.id);
    // Unlocked, the wallet reports its account again and wagmi connects it with no click.
    wallet.unlock();
    await vi.waitFor(() => {
      expect(accountStatus()).toBe("connected");
      expect(activeNetwork()).toBe("eip155:1");
    }, WAIT);
    await settle();
    expect(switchWindowOpen()).toBe(false);
  });

  // Connect itself asks the wallet for AppKit's network, as on a fresh load; a wallet that comes back on its own, still
  // on that network, must still get the window.
  it("still gets the Switch Network window when it comes back on that network", async () => {
    await moveToPolygon();
    wallet.lock();
    await vi.waitFor(() => {
      expect(accountStatus()).toBe("disconnected");
      expect(switchWindowOpen()).toBe(false);
    }, WAIT);
    wallet.unlock();
    await vi.waitFor(() => {
      expect(accountStatus()).toBe("connected");
      expect(switchWindowOpen()).toBe(true);
    }, WAIT);
    // AppKit holds the wallet's network, not the court network it went back to while no wallet was connected.
    await settle();
    expect(activeNetwork()).toBe(`eip155:${String(POLYGON)}`);
    expect(switchWindowOpen()).toBe(true);
  });

  it("still gets the Switch Network window when Connect cannot move it off that network", async () => {
    await moveToPolygon();
    await ConnectionController.disconnect();
    await vi.waitFor(() => {
      expect(accountStatus()).toBe("disconnected");
    }, WAIT);
    wallet.refuseSwitches(true);
    await connectInAppKit();
    await vi.waitFor(() => {
      expect(switchWindowOpen()).toBe(true);
      expect(activeNetwork()).toBe(`eip155:${String(POLYGON)}`);
    }, WAIT);
    await settle();
    expect(activeNetwork()).toBe(`eip155:${String(POLYGON)}`);
    expect(switchWindowOpen()).toBe(true);
    wallet.refuseSwitches(false);
  });
});

describe("WalletConnect's store that boot checks", () => {
  /*
   * Boot removes WalletConnect's unusable stored values through this store (init.ts), so it must be the one
   * WalletConnect's core opens when AppKit starts it: core 2.23.7 opens a KeyValueStorage of the
   * @walletconnect/keyvaluestorage it depends on (core.ts:134), and in the browser build every one of them opens the
   * same IndexedDB database. That class is taken here the way AppKit loads it, so an AppKit or WalletConnect version
   * that opens another store fails this test. Node resolves the packages here; the bundle holds the browser build of
   * the same package.
   */
  it("is the store WalletConnect's core opens when AppKit starts it", () => {
    const path = [
      "@reown/appkit",
      "@walletconnect/universal-provider",
      "@walletconnect/sign-client",
      "@walletconnect/core",
    ];
    const fromCore = path.reduce((from, name) => createRequire(from.resolve(name)), createRequire(import.meta.url));
    const { KeyValueStorage } = fromCore("@walletconnect/keyvaluestorage") as {
      KeyValueStorage: abstract new () => object;
    };
    expect(openWalletConnectStore()).toBeInstanceOf(KeyValueStorage);
  });
});

// Runs last: every request the page made while the tests above connected the wallet and moved it across the court
// chains. wagmi's chains lead with the public RPC only for the wallet; the page's reads still go to the app's RPC.
describe("the page's reads, over this file", () => {
  it("go to the app's read RPC on every court chain, never to a public RPC", () => {
    const publicRpcs = Object.values(PUBLIC_RPC);
    expect(fetched.filter((url) => publicRpcs.some((rpc) => rpc !== undefined && url.startsWith(rpc)))).toEqual([]);
    for (const ownRpc of Object.values(OWN_RPC)) expect(fetched).toContain(ownRpc);
  });
});
