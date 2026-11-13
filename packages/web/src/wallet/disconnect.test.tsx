import type { ReactNode } from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useAccount, WagmiProvider } from "wagmi";
import { readEnv } from "@court/core";
import { createWagmiAdapter } from "./appkit";
import { useDisconnectWallets } from "./disconnect";
import {
  CLOSED_RELAY,
  forgetIn,
  memoryStore,
  NAMESPACES,
  PROJECT_ID,
  realStart,
  resetWalletConnect,
  saved,
  silentRelay,
  stopStarted,
  type MemoryStore,
} from "./testing/walletConnect";
import { endDisconnectLocally } from "./walletConnectRecovery";

/*
 * Disconnect with WalletConnect connected, through the real pieces: WalletConnect's provider with the app's rule
 * (endDisconnectLocally), handed to the wagmi adapter as AppKit hands it over (appkit-base-client.js:1123-1127), which
 * makes wagmi's WalletConnect connector; the session restored by wagmi's reconnect on load, as in the page.
 */

const ENV = readEnv({ REACT_APP_WALLETCONNECT_PROJECT_ID: PROJECT_ID });

let relay: Awaited<ReturnType<typeof silentRelay>>;

beforeAll(async () => {
  relay = await silentRelay();
});

afterAll(() => {
  relay.close();
});

beforeEach(() => {
  vi.stubGlobal("fetch", () => Promise.reject(new Error("unit tests make no network requests")));
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  localStorage.clear();
  resetWalletConnect();
});

afterEach(async () => {
  cleanup();
  await stopStarted();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function connectedThroughWalletConnect(store: MemoryStore, relayUrl: string) {
  const provider = await realStart(store, relayUrl)();
  const forget = forgetIn(store);
  endDisconnectLocally(provider, forget);
  const adapter = createWagmiAdapter(PROJECT_ID, ENV);
  await adapter.setUniversalProvider(provider);
  const config = adapter.wagmiConfig;
  // The chains the connector asked the wallet for when it paired (all of them), as it stores them.
  localStorage.setItem("wagmi.walletConnect.requestedChains", JSON.stringify(config.chains.map(({ id }) => id)));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <WagmiProvider config={config}>
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
  const page = renderHook(() => ({ disconnectWallets: useDisconnectWallets(), account: useAccount() }), { wrapper });
  await waitFor(() => {
    expect(page.result.current.account.connector?.id).toBe("walletConnect");
  });
  return { config, page, provider, forget };
}

describe("Disconnect with WalletConnect connected", () => {
  it.each([
    ["its saved topic key is not hex", saved(NAMESPACES, "zz"), () => CLOSED_RELAY],
    ["its relay cannot be reached", saved(), () => relay.url],
  ])(
    "ends disconnected within 5 s when %s, WalletConnect's data forgotten",
    async (_n, plant, relayUrl) => {
      const store = memoryStore(plant);
      const { config, page, provider, forget } = await connectedThroughWalletConnect(store, relayUrl());

      const startedAt = Date.now();
      await page.result.current.disconnectWallets();
      expect(Date.now() - startedAt).toBeLessThan(5_000);

      expect(config.state.status).toBe("disconnected");
      expect(config.state.connections.size).toBe(0);
      expect(forget).toHaveBeenCalledOnce();
      expect(provider.session).toBeUndefined();
      expect([...store.map.keys()].filter((key) => key.startsWith("wc@"))).toEqual([]);
    },
    10_000,
  );
});
