import "./testing/refusedRelay";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ConnectorController } from "@reown/appkit-controllers";
import { readEnv } from "@court/core";
import { openWalletConnectStore, startAppKit, walletConnectStart } from "./appkit";
import { WAIT } from "./testing/fakeWallet";
import { resetWalletConnect } from "./testing/walletConnect";

/*
 * AppKit as the page starts it, real, given the app's start of WalletConnect (the court patch of @reown/appkit), when
 * every run of AppKit's start fails after it created its WalletConnect, as on saved data WalletConnect cannot read: both
 * of the app's starts fail. One AppKit for the whole file: its controllers are module singletons.
 */

const ENV = readEnv({ REACT_APP_WALLETCONNECT_PROJECT_ID: "00000000000000000000000000000000" });
/** WalletConnect starts on this page: each start counts here (@walletconnect/core 2.23.7 core.ts:235-268). */
const coreStarts = () => (globalThis as { _walletConnectCore__count?: number })._walletConnectCore__count ?? 0;

let starts = 0;
let modal: ReturnType<typeof startAppKit>["modal"];
const cannotStart = vi.fn();

beforeAll(async () => {
  vi.stubGlobal("fetch", () => Promise.reject(new Error("unit tests make no network requests")));
  // jsdom has none; AppKit's window uses it once it opens.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = () => undefined;
      unobserve = () => undefined;
      disconnect = () => undefined;
    },
  );
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0]).includes("Cannot create provider")) cannotStart();
  });
  localStorage.clear();
  resetWalletConnect();
  const start = walletConnectStart(openWalletConnectStore());
  ({ modal } = startAppKit(ENV.walletConnectProjectId ?? "", ENV, window.location.origin, (init) => {
    starts += 1;
    return start(async () => {
      await init();
      throw new Error("probe: WalletConnect's start fails");
    });
  }));
  await vi.waitFor(() => {
    expect(cannotStart).toHaveBeenCalledOnce();
  }, WAIT);
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("AppKit given the app's start of WalletConnect, which fails twice", () => {
  // AppKit keeps the second failure for the load, as it kept its own start's (appkit-base-client.js:1587-1611).
  it("starts WalletConnect no third time, and offers no WalletConnect row", async () => {
    expect(starts).toBe(1);
    expect(coreStarts()).toBe(2);
    expect(ConnectorController.state.allConnectors.some(({ id }) => id === "walletConnect")).toBe(false);

    // Connect still opens (the browser wallets' rows), and starts no WalletConnect either.
    await modal.openConnect();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(starts).toBe(1);
    expect(coreStarts()).toBe(2);
    expect(ConnectorController.state.allConnectors.some(({ id }) => id === "walletConnect")).toBe(false);
  });
});
