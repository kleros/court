import "./wallet/testing/refusedRelay";
import { configure, fireEvent, screen } from "@testing-library/react";
import { ModalController, RouterController } from "@reown/appkit-controllers";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readEnv, type CourtEnv } from "@court/core";

// The entry reads its configuration from ./env; each case picks it (with or without a Reown project id).
const config = vi.hoisted(() => ({ env: undefined as CourtEnv | undefined }));
vi.mock("./env", () => ({
  get env() {
    return config.env;
  },
}));

// The first case that loads AppKit takes about 0.6 s in jsdom; once (a busy machine) it overran the 1 s default wait.
configure({ asyncUtilTimeout: 3000 });

const WITHOUT_PROJECT_ID = readEnv({});
const WITH_PROJECT_ID = readEnv({ REACT_APP_WALLETCONNECT_PROJECT_ID: "00000000000000000000000000000000" });

/** Site data blocked: reading window.localStorage / sessionStorage throws, as Chromium and Firefox do. */
function blockStorage(): void {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    vi.spyOn(window, name, "get").mockImplementation(() => {
      throw new DOMException("Access is denied for this document.", "SecurityError");
    });
  }
}

/** Full storage: every write throws. */
function fillStorage(): void {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  });
}

/** Loads the entry module afresh, as a page load does. */
async function boot(env: CourtEnv): Promise<void> {
  config.env = env;
  vi.resetModules();
  await import("./main");
}

// Unit tests make no network requests: AppKit's remote config fails and it starts with the local options, and
// WalletConnect's relay is refused (wallet/testing/refusedRelay.ts). For the whole file, since AppKit keeps starting
// after a case has ended.
beforeAll(() => {
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
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Storage failures never stop the page from rendering, nor take away Connect when a wallet can connect. Here: the
// app's own code and wagmi. jsdom loads the Node build of WalletConnect's storage, which never touches the browser's
// storage; its browser build is checked in walletConnectStorage.test.ts and, with Connect and a wallet, in real
// browsers.
describe.each([
  ["blocked", blockStorage],
  ["full", fillStorage],
])("boot with storage %s", (_name, breakStorage) => {
  it("renders the page with no Reown project id", async () => {
    breakStorage();
    await boot(WITHOUT_PROJECT_ID);
    expect(await screen.findByRole("heading", { name: "Kleros Court" })).toBeTruthy();
  });

  it("renders the page and its Connect button with a Reown project id", async () => {
    breakStorage();
    await boot(WITH_PROJECT_ID);
    expect(await screen.findByRole("heading", { name: "Kleros Court" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Connect" })).toBeTruthy();
  });
});

// A stored wallet state of the wrong shape (JSON, so the storage layer's JSON check passes it) emptied the page: the
// account read on the first render threw. It is dropped instead; wagmi then stores its own empty state.
describe.each([
  ["connections {}", '{"state":{"connections":{},"chainId":1,"current":"x"},"version":2}'],
  ["connections null", '{"state":{"connections":null,"chainId":1,"current":null},"version":2}'],
  [
    "a null connection",
    '{"state":{"connections":{"__type":"Map","value":[["x",null]]},"chainId":1,"current":"x"},"version":2}',
  ],
])("boot with a stored wallet state whose %s", (_name, planted) => {
  it("renders the page with no Reown project id", async () => {
    window.localStorage.setItem("wagmi.store", planted);
    await boot(WITHOUT_PROJECT_ID);
    expect(await screen.findByRole("heading", { name: "Kleros Court" })).toBeTruthy();
    expect(window.localStorage.getItem("wagmi.store")).not.toBe(planted);
  });

  it("renders the page and offers Connect with a Reown project id", async () => {
    window.localStorage.setItem("wagmi.store", planted);
    await boot(WITH_PROJECT_ID);
    expect(await screen.findByRole("heading", { name: "Kleros Court" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Connect" })).toBeTruthy();
    expect(window.localStorage.getItem("wagmi.store")).not.toBe(planted);
  });
});

// AppKit reads its own stored values, not through the app's storage. A wallet that was on a chain the court does not
// run, then disconnected or locked, left AppKit's stored network on that chain: every later load opened AppKit's
// "Switch Network" window with no wallet connected, and it could not be closed. View-only must keep working (spec
// 01.4).
describe("boot after AppKit stored a network the court does not run", () => {
  afterEach(() => {
    ModalController.close();
  });

  it("opens no window when no wallet is connected, and forgets that network", async () => {
    window.localStorage.setItem("@appkit/active_caip_network_id", "eip155:137");
    await boot(WITH_PROJECT_ID);
    expect(await screen.findByRole("button", { name: "Connect" })).toBeTruthy();
    expect(window.localStorage.getItem("@appkit/active_caip_network_id")).not.toBe("eip155:137");
    expect(ModalController.state.open).toBe(false);
    expect(RouterController.state.view).not.toBe("UnsupportedChain");
  });

  it("opens no window for a stored wallet connection on that network once the wallet is locked", async () => {
    // As wagmi stored it while the wallet was connected on Polygon; the wallet no longer answers with an account.
    const connector = { id: "io.test.mockwallet", name: "Mock Wallet", type: "injected", uid: "u" };
    const connection = { accounts: ["0x1111111111111111111111111111111111111111"], chainId: 137, connector };
    const state = { connections: { __type: "Map", value: [["u", connection]] }, chainId: 1, current: "u" };
    window.localStorage.setItem("wagmi.store", JSON.stringify({ state, version: 2 }));
    await boot(WITH_PROJECT_ID);
    expect(await screen.findByRole("button", { name: "Connect" })).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(ModalController.state.open).toBe(false);
    expect(RouterController.state.view).not.toBe("UnsupportedChain");
  });
});

// A stored AppKit value of another shape than AppKit writes (valid JSON, so AppKit parsed it) broke Connect on every
// load: `null` connections made AppKit's start fail. Planted by anything that can write the court origin's storage.
describe("boot with a stored AppKit value of the wrong shape", () => {
  afterEach(() => {
    ModalController.close();
  });

  it("removes it, and Connect does not fail", async () => {
    const refused = vi.spyOn(console, "error");
    window.localStorage.setItem("@appkit/connections", "null");
    await boot(WITH_PROJECT_ID);
    fireEvent.click(await screen.findByRole("button", { name: "Connect" }));
    // The button reads "Connecting…" until AppKit has started and opened its window, or refused.
    expect(await screen.findByRole("button", { name: "Connect" })).toHaveProperty("disabled", false);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(refused).not.toHaveBeenCalledWith("Wallet connection refused.", expect.anything());
    expect(window.localStorage.getItem("@appkit/connections")).not.toBe("null");
  });
});
