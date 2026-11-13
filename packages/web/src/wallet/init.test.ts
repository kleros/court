import { afterEach, describe, expect, it, vi } from "vitest";
import { readEnv } from "@court/core";
import { initWallet, readOnlyWagmiConfig, type WalletSetup } from "./init";
import { WALLET_CONNECT_CHECK_MS } from "./walletConnectValues";

// AppKit's chunk replaced, to see what boot hands AppKit and when: the real pieces are covered by appkit.test.ts,
// appkitStart.test.ts and walletConnectRecovery.test.ts.
const appKit = vi.hoisted(() => {
  const store = { getItem: vi.fn<() => Promise<unknown>>(), removeItem: () => Promise.resolve() };
  const start = vi.fn<() => Promise<unknown>>();
  return {
    store,
    start,
    walletConnectStart: vi.fn<(store: unknown) => typeof start>(() => start),
    startAppKit: vi.fn<(projectId: string, env: unknown, origin: string, start: unknown) => WalletSetup>(),
  };
});
vi.mock("./appkit", () => ({
  openWalletConnectStore: () => appKit.store,
  walletConnectStart: appKit.walletConnectStart,
  startAppKit: appKit.startAppKit,
}));

const ENV = readEnv({ REACT_APP_WALLETCONNECT_PROJECT_ID: "5ca1ab1e5ca1ab1e5ca1ab1e5ca1ab1e" });
const ORIGIN = "https://court.example";
const setup: WalletSetup = { config: readOnlyWagmiConfig(ENV), modal: { openConnect: () => Promise.resolve() } };

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("WalletConnect's start at boot", () => {
  // AppKit is created at once, as before the app ran WalletConnect's start: the browser wallets it adds (wagmi's
  // injected connector among them) never wait on WalletConnect. AppKit runs the app's start when it starts
  // WalletConnect (appkitStart.test.ts).
  it("hands AppKit the app's start of WalletConnect, on the store it checked, and runs none itself", async () => {
    appKit.store.getItem.mockResolvedValue(undefined);
    appKit.startAppKit.mockReturnValue(setup);

    await expect(initWallet(ENV, ORIGIN)).resolves.toBe(setup);
    expect(appKit.walletConnectStart).toHaveBeenCalledWith(appKit.store);
    expect(appKit.startAppKit).toHaveBeenCalledWith(ENV.walletConnectProjectId, ENV, ORIGIN, appKit.start);
    expect(appKit.start).not.toHaveBeenCalled();
  });

  // A store that did not answer will not answer WalletConnect's start either, nor the forgetting of its data.
  it("lets AppKit start WalletConnect itself, as before, when its store does not answer the check", async () => {
    vi.useFakeTimers();
    appKit.store.getItem.mockReturnValue(new Promise<never>(() => undefined));
    appKit.startAppKit.mockReturnValue(setup);

    let booted = false;
    void initWallet(ENV, ORIGIN).then(() => {
      booted = true;
    });
    await vi.advanceTimersByTimeAsync(WALLET_CONNECT_CHECK_MS);
    expect(booted).toBe(true);
    expect(appKit.walletConnectStart).not.toHaveBeenCalled();
    expect(appKit.startAppKit).toHaveBeenCalledWith(ENV.walletConnectProjectId, ENV, ORIGIN, undefined);
  });
});
