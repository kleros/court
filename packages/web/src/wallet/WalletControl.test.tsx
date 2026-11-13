import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig, useConnect, WagmiProvider, type Config } from "wagmi";
import { mock } from "wagmi/connectors";
import { readEnv } from "@court/core";
import { COURT_CHAINS } from "./chains";
import { chainLabel, EMBEDDED_WALLET_REFUSAL, walletState, type WalletModal } from "./connection";
import { connectModal } from "./appkit";
import { ownTransports } from "./transports";
import { WalletControl } from "./WalletControl";
import { walletStorage } from "./walletStorage";

const A = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const B = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

/** wagmi's mock connector: answers eth_requestAccounts and eth_chainId itself; reads would fail (no RPC configured). */
function mockConfig(): Config {
  return createConfig({
    chains: COURT_CHAINS,
    connectors: [mock({ accounts: [A, B] })],
    transports: ownTransports(readEnv({})),
  });
}

/** One button per configured connector: "test connect 1", "test connect 2", ... */
function TestConnect() {
  const { connect, connectors } = useConnect();
  return connectors.map((connector, index) => (
    <button
      key={connector.uid}
      type="button"
      onClick={() => {
        connect({ connector });
      }}
    >
      test connect {index + 1}
    </button>
  ));
}

function renderControl(config: Config, modal: WalletModal | null) {
  return render(
    <WagmiProvider config={config}>
      <QueryClientProvider client={new QueryClient()}>
        <WalletControl modal={modal} />
        <TestConnect />
      </QueryClientProvider>
    </WagmiProvider>,
  );
}

const noModal = { openConnect: () => Promise.resolve() };

afterEach(cleanup);

describe("WalletControl", () => {
  it("shows no Connect control in read-only mode", () => {
    renderControl(mockConfig(), null);
    expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();
  });

  it("Connect opens the modal", () => {
    const openConnect = vi.fn(() => Promise.resolve());
    renderControl(mockConfig(), { openConnect });
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(openConnect).toHaveBeenCalledOnce();
  });

  it("says so when the modal refuses to open, and Connect can be tried again", async () => {
    renderControl(mockConfig(), { openConnect: () => Promise.reject(new Error(EMBEDDED_WALLET_REFUSAL)) });
    vi.spyOn(console, "error").mockImplementationOnce(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Wallet connection is unavailable.");
    expect(screen.getByRole("button", { name: "Connect" })).toHaveProperty("disabled", false);
  });

  it("Connect shows it is busy until the modal opens and ignores clicks meanwhile", async () => {
    let showModal: () => void = () => undefined;
    const openConnect = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          showModal = resolve;
        }),
    );
    renderControl(mockConfig(), { openConnect });
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    const busy = screen.getByRole("button", { name: "Connecting…" });
    expect(busy).toHaveProperty("disabled", true);
    fireEvent.click(busy);
    expect(openConnect).toHaveBeenCalledOnce();

    await act(async () => {
      showModal();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Connect" })).toHaveProperty("disabled", false);
  });

  it("shows the connected account and the wallet's chain; an account switch leaves nothing of the old one", async () => {
    const config = mockConfig();
    const { container } = renderControl(config, noModal);
    fireEvent.click(screen.getByRole("button", { name: "test connect 1" }));
    expect((await screen.findByTestId("wallet-address")).textContent).toBe(A);
    expect(screen.getByTestId("wallet-chain").textContent).toBe("Ethereum (1)");
    expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();

    act(() => {
      config.connectors[0]?.emitter.emit("change", { accounts: [B] });
    });
    expect(screen.getByTestId("wallet-address").textContent).toBe(B);
    expect(container.textContent.toLowerCase()).not.toContain(A.toLowerCase());

    act(() => {
      config.connectors[0]?.emitter.emit("change", { chainId: 100 });
    });
    expect(screen.getByTestId("wallet-chain").textContent).toBe("Gnosis (100)");
  });

  it("Disconnect returns to Connect", async () => {
    renderControl(mockConfig(), noModal);
    fireEvent.click(screen.getByRole("button", { name: "test connect 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }));
    expect(await screen.findByRole("button", { name: "Connect" })).toBeTruthy();
    expect(screen.queryByTestId("wallet-address")).toBeNull();
  });

  it("Disconnect ends every wallet connection, not only the current one", async () => {
    // As after a load where wagmi restored two wallets that had both authorised the site.
    const config = createConfig({
      chains: COURT_CHAINS,
      connectors: [mock({ accounts: [A] }), mock({ accounts: [B] })],
      transports: ownTransports(readEnv({})),
    });
    renderControl(config, noModal);
    fireEvent.click(screen.getByRole("button", { name: "test connect 1" }));
    expect((await screen.findByTestId("wallet-address")).textContent).toBe(A);
    fireEvent.click(screen.getByRole("button", { name: "test connect 2" }));
    await waitFor(() => {
      expect(screen.getByTestId("wallet-address").textContent).toBe(B);
    });
    expect(config.state.connections.size).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(await screen.findByRole("button", { name: "Connect" })).toBeTruthy();
    expect(screen.queryByTestId("wallet-address")).toBeNull();
    expect(config.state.connections.size).toBe(0);
  });
});

// Stored wallet values wagmi read unchecked and choked on: its reconnect on load threw before trying any wallet, left
// the stale stored connections in its state, and Disconnect then threw on them. Planted by anything that can write
// the court origin's storage (another court page or build, an extension, someone at the device). Red cases are run
// one at a time: a reconnect that throws leaves wagmi's module-wide "reconnecting" flag set for the rest of the file.
describe("stored wallet values wagmi cannot use", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("unit tests make no network requests")));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const NO_TEXT = { toString: null };
  const storedState = (connectorId: unknown) =>
    JSON.stringify({
      state: {
        connections: {
          __type: "Map",
          value: [
            ["x", { accounts: [B], chainId: 1, connector: { id: connectorId, name: "M", type: "mock", uid: "x" } }],
          ],
        },
        chainId: 1,
        current: "x",
      },
      version: 2,
    });
  const CASES = [
    ["a last-wallet id that is an object", "wagmi.recentConnectorId", JSON.stringify(NO_TEXT)],
    ["a last-wallet id that is a list", "wagmi.recentConnectorId", JSON.stringify([NO_TEXT])],
    ["a stored connection whose connector id is an object", "wagmi.store", storedState(NO_TEXT)],
  ] as const;

  /**
   * wagmi over the app's wallet storage, once it has loaded what is stored. The mock wallet has not authorised the site
   * (it answers that itself; asked for accounts while authorised it would call a public RPC).
   */
  async function storedConfig(): Promise<Config> {
    const config = createConfig({
      chains: COURT_CHAINS,
      connectors: [mock({ accounts: [A], features: { reconnect: true } })],
      storage: walletStorage(),
      transports: ownTransports(readEnv({})),
    });
    // wagmi's Config type leaves out the persist API of the store it creates (createConfig.js:148-193).
    const store = config._internal.store as unknown as { persist: { hasHydrated(): boolean } };
    await waitFor(() => {
      expect(store.persist.hasHydrated()).toBe(true);
    });
    return config;
  }

  it.each(CASES)("%s: the reconnect on load finishes and the value is removed", async (_name, key, value) => {
    window.localStorage.clear();
    window.localStorage.setItem(key, value);
    const config = await storedConfig();
    renderControl(config, noModal);
    // wagmi's reconnect ends "disconnected" when no wallet reconnects; one that threw stayed "connecting" or
    // "reconnecting", and wagmi skipped every later reconnect.
    await waitFor(() => {
      expect(config.state.status).toBe("disconnected");
    });
    expect(window.localStorage.getItem(key)).not.toBe(value);
  });

  it.each(CASES)("%s: Disconnect works after Connect", async (_name, key, value) => {
    window.localStorage.clear();
    window.localStorage.setItem(key, value);
    const config = await storedConfig();
    renderControl(config, noModal);
    const failed = vi.spyOn(console, "error");
    fireEvent.click(screen.getByRole("button", { name: "test connect 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }));
    expect(await screen.findByRole("button", { name: "Connect" })).toBeTruthy();
    expect(screen.queryByTestId("wallet-address")).toBeNull();
    expect(config.state.connections.size).toBe(0);
    expect(failed).not.toHaveBeenCalledWith("Disconnect failed.", expect.anything());
    expect(window.localStorage.getItem(key)).not.toBe(value);
  });
});

describe("walletState", () => {
  const injected = { id: "io.test.mockwallet", type: "injected" };

  it("is connected only once wagmi says so", () => {
    expect(walletState({ status: "connected", address: A, chainId: 1, connector: injected })).toEqual({
      status: "connected",
      address: A,
      chainId: 1,
    });
    expect(walletState({ status: "reconnecting", address: A, chainId: 1, connector: injected })).toEqual({
      status: "disconnected",
    });
  });

  it("never counts AppKit's embedded wallet (AUTH) as a connection", () => {
    for (const connector of [
      { id: "AUTH", type: "AUTH" },
      { id: "other", type: "auth" },
    ]) {
      expect(walletState({ status: "connected", address: A, chainId: 1, connector })).toEqual({
        status: "disconnected",
      });
    }
  });

  it("names unsupported chains as such", () => {
    expect(chainLabel(137)).toBe("Unsupported chain (137)");
    expect(chainLabel(10200)).toBe("Gnosis Chiado (10200)");
  });
});

describe("connectModal", () => {
  function fakeAppKit(connectorTypes: string[]) {
    return {
      ready: vi.fn(() => Promise.resolve()),
      getConnectors: () => connectorTypes.map((type) => ({ id: type, type })),
      open: vi.fn(() => Promise.resolve()),
    };
  }

  it("opens the Connect view once AppKit is ready", async () => {
    const appKit = fakeAppKit(["INJECTED", "ANNOUNCED", "WALLET_CONNECT"]);
    await connectModal(appKit).openConnect();
    expect(appKit.ready).toHaveBeenCalledOnce();
    expect(appKit.open).toHaveBeenCalledWith({ view: "Connect" });
  });

  it("refuses when AppKit registered the embedded wallet", async () => {
    const appKit = fakeAppKit(["INJECTED", "AUTH"]);
    await expect(connectModal(appKit).openConnect()).rejects.toThrow(EMBEDDED_WALLET_REFUSAL);
    expect(appKit.open).not.toHaveBeenCalled();
  });
});
