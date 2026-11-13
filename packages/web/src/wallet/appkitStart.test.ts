import "./testing/refusedRelay";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ConnectorController } from "@reown/appkit-controllers";
import type UniversalProvider from "@walletconnect/universal-provider";
import { readEnv } from "@court/core";
import { openWalletConnectStore, startAppKit, walletConnectStart } from "./appkit";
import { appMetadata } from "./appkitOptions";
import { WAIT } from "./testing/fakeWallet";
import { memoryStore, realStart, resetWalletConnect, saved, stopStarted } from "./testing/walletConnect";

/*
 * The app's start of WalletConnect, which AppKit runs where it always started WalletConnect, through the court patch of
 * @reown/appkit (.yarn/patches). Without that patch AppKit starts WalletConnect itself and this file fails.
 */

describe("the app's start of WalletConnect", () => {
  // Run here directly, before AppKit starts below, on WalletConnect's real provider and a store in memory.
  it("forgets the saved data in the store it is given when AppKit's start fails on it, and runs it again", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    resetWalletConnect();
    const store = memoryStore({ ...saved(null), wc_storage_version: 1 });
    const init = realStart(store);

    const provider = await walletConnectStart(store)(init);

    expect(init).toHaveBeenCalledTimes(2);
    expect(provider.session).toBeUndefined();
    expect([...store.map.keys()]).toEqual(["wc_storage_version"]);
    await stopStarted();
    resetWalletConnect();
  });
});

/*
 * AppKit as the page starts it, real, given the app's start. One AppKit for the whole file: its controllers are module
 * singletons. No saved data: the start works at once, so what these tests see is that the start AppKit ran is the
 * app's, with AppKit's own options.
 */
describe("AppKit's start of WalletConnect", () => {
  const ENV = readEnv({ REACT_APP_WALLETCONNECT_PROJECT_ID: "00000000000000000000000000000000" });
  const PROJECT_ID = ENV.walletConnectProjectId ?? "";
  // The page's own origin, as the page passes it: WalletConnect replaces a metadata URL on another host with the page's.
  const ORIGIN = window.location.origin;

  /** How many times AppKit ran the app's start of WalletConnect, and the provider it started. */
  let starts = 0;
  let provider: UniversalProvider;

  beforeAll(async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("unit tests make no network requests")));
    localStorage.clear();
    const start = walletConnectStart(openWalletConnectStore());
    // Without the patch AppKit never runs the app's start: this waits until the hook's timeout fails the file.
    provider = await new Promise<UniversalProvider>((resolve, reject) => {
      startAppKit(PROJECT_ID, ENV, ORIGIN, (init) => {
        starts += 1;
        const started = start(init);
        started.then(resolve, reject);
        return started;
      });
    });
  });

  afterAll(async () => {
    provider.client.core.heartbeat.stop();
    await provider.client.core.relayer.transportClose().catch(() => undefined);
  });

  it("is the app's start, and WalletConnect's row is offered with the provider it started", async () => {
    await vi.waitFor(() => {
      const row = ConnectorController.state.allConnectors.find(({ id }) => id === "walletConnect");
      expect(row?.provider).toBe(provider);
    }, WAIT);
    expect(starts).toBe(1);
  });

  // The app's start passes no options of its own: WalletConnect runs with AppKit's (appkit-base-client.js:1483-1499).
  it("runs with AppKit's own options: the project id, the app's metadata, AppKit's logger (not a log level)", () => {
    expect(provider.providerOpts.projectId).toBe(PROJECT_ID);
    expect(provider.providerOpts.metadata).toEqual(appMetadata(ORIGIN));
    expect(typeof provider.providerOpts.logger).toBe("object");
  });

  it("gives the provider AppKit uses the app's Disconnect rule: a disconnect that throws ends here", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    provider.session = { topic: "b".repeat(64) } as UniversalProvider["session"];
    vi.spyOn(provider.client, "disconnect").mockRejectedValue(new Error("Non-base16 character"));

    await expect(provider.disconnect()).resolves.toBeUndefined();
    expect(provider.session).toBeUndefined();
  });
});
