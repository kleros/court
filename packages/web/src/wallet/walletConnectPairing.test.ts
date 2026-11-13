import "./testing/answeringRelay";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type UniversalProvider from "@walletconnect/universal-provider";
import { walletConnectStart } from "./appkit";
import { relay } from "./testing/answeringRelay";
import {
  forgetIn,
  memoryStore,
  NAMESPACES,
  OWN_NAMESPACES,
  realStart,
  resetWalletConnect,
  saved,
  stopStarted,
  TOPIC,
} from "./testing/walletConnect";
import { startWalletConnect } from "./walletConnectRecovery";

/*
 * WalletConnect's real provider on a relay that answers (testing/answeringRelay.ts), so that Connect can show a pairing
 * address: what the WalletConnect row shows to be scanned. Saved data must never keep it from showing one.
 */

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  localStorage.clear();
  resetWalletConnect();
  relay.openAfterMs = 0;
  relay.opened = 0;
});

afterEach(async () => {
  await stopStarted();
  vi.restoreAllMocks();
});

/** Connect as AppKit runs it, with optional namespaces only (adapter-wagmi WalletConnectConnector.js:52-56). */
function pairingAddress(provider: UniversalProvider): Promise<string> {
  return new Promise((resolve, reject) => {
    provider.once("display_uri", resolve);
    // No wallet answers: the pairing waits for one until the test stops the provider.
    provider
      .connect({ optionalNamespaces: { eip155: { chains: ["eip155:1"], methods: ["personal_sign"], events: [] } } })
      .catch(reject);
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Namespaces WalletConnect's sign client refuses to propose (its methods must be text). */
const REFUSED_NAMESPACES = { eip155: { chains: ["eip155:1"], methods: [5], events: [] } };

describe("Connect of WalletConnect", () => {
  it("with nothing saved shows a pairing address", async () => {
    const store = memoryStore();
    const provider = await walletConnectStart(store)(realStart(store));
    await expect(pairingAddress(provider)).resolves.toMatch(/^wc:/);
  });

  // WalletConnect asks the store for its namespaces under this key when it has no session (UniversalProvider.ts:266-268,
  // :582-585) and its next pairing asks the wallet for them as required (:193-197).
  it.each([
    ["no namespaces for a chain family", { eip155: null }],
    ["methods that are not text", REFUSED_NAMESPACES],
    ["text", "zz"],
  ])("shows a pairing address when namespaces saved with no session hold %s", async (_n, value) => {
    const store = memoryStore({ "wc@2:universal_provider:/namespaces": value, wc_storage_version: 1 });
    const start = realStart(store);

    const provider = await walletConnectStart(store)(start);

    expect(start).toHaveBeenCalledOnce();
    expect(provider.session).toBeUndefined();
    await expect(pairingAddress(provider)).resolves.toMatch(/^wc:/);
    // A start that works forgets nothing saved.
    expect(store.removeItem).not.toHaveBeenCalled();
  });

  // Its saved topic key is not hex, so WalletConnect's own Disconnect throws and the app ends it here.
  it("after a Disconnect ended here shows a pairing address, also when the session kept namespaces it refuses", async () => {
    const store = memoryStore({ ...saved(NAMESPACES, "zz"), [OWN_NAMESPACES]: REFUSED_NAMESPACES });
    const provider = await walletConnectStart(store)(realStart(store));
    expect(provider.session?.topic).toBe(TOPIC);

    await provider.disconnect();
    expect(provider.session).toBeUndefined();

    await expect(pairingAddress(provider)).resolves.toMatch(/^wc:/);
  });

  // WalletConnect uses a session's namespaces for that session: without them it reports no chain the wallet switches to
  // (UniversalProvider.ts:478-511).
  it("leaves the namespaces of a session the start restored", async () => {
    const store = memoryStore({ ...saved(), [OWN_NAMESPACES]: NAMESPACES });
    const provider = await walletConnectStart(store)(realStart(store));
    expect(provider.session?.topic).toBe(TOPIC);
    expect(provider.namespaces).toEqual(NAMESPACES);
  });
});

/** The relay subscriptions a session leaves saved (@walletconnect/core 2.23.7 Subscriber), as a browser stored them. */
const SUBSCRIPTIONS = {
  "wc@2:core:0.3//subscription": [{ topic: TOPIC, relay: { protocol: "irn" }, id: "0d".repeat(32) }],
};

describe("WalletConnect's relay connection", () => {
  // The control for the next test: the relay's connections are seen, and one WalletConnect keeps stays open.
  it("stays open for a start that works, opened as late as the network lets it", async () => {
    relay.openAfterMs = 300;
    const store = memoryStore({ ...saved(), ...SUBSCRIPTIONS, wc_storage_version: 1 });
    await startWalletConnect(realStart(store), forgetIn(store));

    await vi.waitFor(() => {
      expect(relay.opened).toBe(1);
    });
    await sleep(1_000);
    expect(relay.open.size).toBe(1);
  });

  // The failed start's client would still take the wallet's messages for the old session and rewrite WalletConnect's
  // saved data with them, under the retry's own: the wallet ending that old session removed the new one.
  it("of a start that failed stays closed: it is closed whenever it opens, and a request opens nothing", async () => {
    relay.openAfterMs = 300;
    const store = memoryStore({ ...saved(null), ...SUBSCRIPTIONS, wc_storage_version: 1 });
    const start = realStart(store);
    interface Relayer {
      connected: boolean;
      transportExplicitlyClosed: boolean;
      request(request: { method: string; params: unknown }): Promise<unknown>;
      transportDisconnect(): Promise<void>;
      transportOpen(): Promise<void>;
    }
    const global = globalThis as { _walletConnectCore_?: { relayer: Relayer } };
    let failed: Relayer | undefined;
    await startWalletConnect(async () => {
      try {
        return await start();
      } finally {
        failed ??= global._walletConnectCore_?.relayer;
      }
    }, forgetIn(store));
    expect(start).toHaveBeenCalledTimes(2);

    // Its connection was still opening when the start failed: it opens now, and is closed.
    await vi.waitFor(() => {
      expect(relay.opened).toBeGreaterThan(0);
    });
    await sleep(1_000);
    expect(relay.open.size).toBe(0);
    expect(failed?.connected).toBe(false);

    // A request of the failed client: refused, and no connection opens for it.
    const before = relay.opened;
    await expect(failed?.request({ method: "irn_batchSubscribe", params: { topics: [TOPIC] } })).rejects.toThrow();
    await sleep(600);
    expect(relay.opened).toBe(before);

    // What the browser's offline then online events do to it (relayer.ts:625-638): it opens again, and is closed.
    const opened = relay.opened;
    await failed?.transportDisconnect();
    if (failed !== undefined) failed.transportExplicitlyClosed = false;
    void failed?.transportOpen().catch(() => undefined);
    await vi.waitFor(() => {
      expect(relay.opened).toBeGreaterThan(opened);
    });
    await sleep(1_000);
    expect(relay.open.size).toBe(0);
    expect(failed?.connected).toBe(false);
  }, 10_000);
});
