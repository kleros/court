import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import UniversalProvider from "@walletconnect/universal-provider";
import { createSafeStorage } from "@court/core";
import { browserLocalStorage } from "../storage";
import {
  CLOSED_RELAY,
  forgetIn,
  KEYCHAIN,
  memoryStore,
  NAMESPACES,
  OWN_NAMESPACES,
  realStart,
  resetWalletConnect,
  saved,
  session,
  SESSIONS,
  silentRelay,
  stopStarted,
  TOPIC,
  UNHANDLED,
  walletRequest,
  type MemoryStore,
} from "./testing/walletConnect";
import {
  endDisconnectLocally,
  forgetAfterDisconnect,
  forgetWalletConnect,
  startWalletConnect,
  WALLET_CONNECT_DISCONNECT_MS,
  type WalletConnectProvider,
} from "./walletConnectRecovery";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  localStorage.clear();
  resetWalletConnect();
});

afterEach(async () => {
  vi.useRealTimers();
  await stopStarted();
  vi.restoreAllMocks();
});

describe("WalletConnect's start", () => {
  it("that works forgets nothing: a saved session is kept while the relay cannot be reached", async () => {
    const store = memoryStore(saved());
    const start = realStart(store);
    const forget = forgetIn(store);

    const provider = await startWalletConnect(start, forget);

    expect(provider.session?.topic).toBe(TOPIC);
    expect(start).toHaveBeenCalledOnce();
    expect(forget).not.toHaveBeenCalled();
    expect(store.removeItem).not.toHaveBeenCalled();
  });

  it.each([
    ["a session's namespaces null", saved(null)],
    ["a session's accounts not text", saved({ eip155: { ...NAMESPACES.eip155, accounts: [5] } })],
    ["its own namespaces for a session holding null", { ...saved(), [OWN_NAMESPACES]: { eip155: null } }],
  ])("that fails on %s forgets WalletConnect's saved data and starts once more, with no session", async (_n, plant) => {
    const store = memoryStore({ ...plant, wc_storage_version: 1 });
    const start = realStart(store);
    const forget = forgetIn(store);

    const provider = await startWalletConnect(start, forget);

    expect(provider).toBeInstanceOf(UniversalProvider);
    expect(provider.session).toBeUndefined();
    expect(start).toHaveBeenCalledTimes(2);
    expect(forget).toHaveBeenCalledOnce();
    // One sign client on the relay's messages (and the core's own subscriber), as after a first start.
    expect(provider.client.core.relayer.events.listenerCount("relayer_message")).toBe(2);
    // WalletConnect's own mark of its storage migration stays: without it, a later start would copy old localStorage
    // values in again.
    expect([...store.map]).toEqual([["wc_storage_version", 1]]);
  });

  // The page keeps one WalletConnect core on globalThis and a retry would reuse it, with the failed start's client
  // still taking the relay's messages: it answered the wallet's session updates with errors and threw at every ping.
  it("that fails is stopped before the retry, which then runs alone on the store", async () => {
    const store = memoryStore({ ...saved(null), wc_storage_version: 1 });
    const start = realStart(store);
    interface Core {
      heartbeat: { stop(): void };
      relayer: { transportExplicitlyClosed: boolean };
      storage: { setItem(key: string, value: unknown): Promise<void>; removeItem(key: string): Promise<void> };
    }
    const global = globalThis as { _walletConnectCore_?: Core };
    let failed: Core | undefined;
    let stopHeartbeat: unknown;
    const forget = vi.fn(async () => {
      // When the data is forgotten, the failed start's WalletConnect is stopped and gone from the page already.
      expect(global._walletConnectCore_).toBeUndefined();
      await forgetIn(store)();
    });
    const provider = await startWalletConnect(async () => {
      try {
        return await start();
      } finally {
        if (failed === undefined && global._walletConnectCore_ !== undefined) {
          failed = global._walletConnectCore_;
          stopHeartbeat = vi.spyOn(failed.heartbeat, "stop");
        }
      }
    }, forget);

    expect(forget).toHaveBeenCalledOnce();
    expect(stopHeartbeat).toHaveBeenCalledOnce();
    expect(failed?.relayer.transportExplicitlyClosed).toBe(true);
    expect(provider.client.core).not.toBe(failed);
    expect(global._walletConnectCore_).toBe(provider.client.core);
    // As after a first start: one sign client (and the core's own subscriber) on the relay's messages.
    expect(provider.client.core.relayer.events.listenerCount("relayer_message")).toBe(2);
    // Its writes to the store go nowhere.
    const kept = [...store.map];
    await failed?.storage.setItem(SESSIONS, []);
    await failed?.storage.removeItem("wc_storage_version");
    expect([...store.map]).toEqual(kept);
  });

  // AppKit then keeps the failure for the whole load, as it always did with its own start: no WalletConnect row, no
  // further start (appkit-base-client.js:1587-1611).
  it("that fails twice rejects with the second failure: no third start", async () => {
    // A store that cannot read WalletConnect's keychain, before and after it is removed.
    const store = memoryStore(saved(), { failingRead: KEYCHAIN });
    const start = realStart(store);
    const forget = forgetIn(store);

    await expect(startWalletConnect(start, forget)).rejects.toThrow("store read failed");
    expect(start).toHaveBeenCalledTimes(2);
    expect(forget).toHaveBeenCalledOnce();
  });

  it("that fails starts once more when the store refuses to remove one of WalletConnect's keys", async () => {
    const REFUSED = "wc@2:poison:..";
    const store = memoryStore({ ...saved(null), [REFUSED]: {}, wc_storage_version: 1 }, { refusedRemoval: REFUSED });
    const start = realStart(store);

    const provider = await startWalletConnect(start, forgetIn(store));

    expect(provider.session).toBeUndefined();
    expect(start).toHaveBeenCalledTimes(2);
    expect([...store.map.keys()]).toEqual([REFUSED, "wc_storage_version"]);
  });

  // The failed start's sign client handles, a second after its start and with no relay, the wallet's messages saved as
  // received but not handled (sign-client 2.23.7 engine.ts:188-193, :197-218). Its handling of a session delete
  // rewrote WalletConnect's saved sessions and keys with its own (engine.ts:1498-1509): a pairing made in that time was
  // gone at the next load.
  it("that fails writes nothing more to the store: a saved delete of the old session leaves a new one", async () => {
    const message = await walletRequest("wc_sessionDelete", { code: 6000, message: "User disconnected." });
    const store = memoryStore({
      ...saved(),
      [OWN_NAMESPACES]: { eip155: null },
      [UNHANDLED]: { [TOPIC]: message },
      wc_storage_version: 1,
    });
    const start = realStart(store);
    interface Core {
      crypto: { keychain: { has(tag: string): boolean } };
    }
    const global = globalThis as { _walletConnectCore_?: Core };
    let failed: Core | undefined;
    const provider = await startWalletConnect(async () => {
      try {
        return await start();
      } finally {
        failed ??= global._walletConnectCore_;
      }
    }, forgetIn(store));
    expect(start).toHaveBeenCalledTimes(2);

    // A pairing right after the start: WalletConnect saves its key and its session.
    const NEW = "aa".repeat(32);
    await provider.client.core.crypto.keychain.set(NEW, "22".repeat(32));
    await provider.client.session.set(NEW, session(NEW, NAMESPACES));

    // The failed client handled the saved delete: it dropped the old session's key, in its memory only.
    await vi.waitFor(
      () => {
        expect(failed?.crypto.keychain.has(TOPIC)).toBe(false);
      },
      { timeout: 3_000 },
    );
    expect((store.map.get(SESSIONS) as { topic: string }[]).map(({ topic }) => topic)).toEqual([NEW]);
    expect(store.map.get(KEYCHAIN)).toHaveProperty(NEW);
  });

  it("that cannot forget rejects without starting again", async () => {
    const start = vi.fn(() => Promise.reject(new Error("unreadable saved data")));
    const forget = vi.fn(() => Promise.reject(new Error("store refuses removals")));

    await expect(startWalletConnect(start, forget)).rejects.toThrow("store refuses removals");
    expect(start).toHaveBeenCalledOnce();
  });

  // AppKit waits for this start before its Connect window opens, browser wallets included (appkit.ts connectModal).
  it("whose saved data cannot be forgotten in 1 s rejects then, without starting again", async () => {
    vi.useFakeTimers();
    const start = vi.fn(() => Promise.reject(new Error("unreadable saved data")));
    const forget = vi.fn(() => new Promise<never>(() => undefined));

    let outcome: unknown = "pending";
    startWalletConnect(start, forget).then(
      () => (outcome = "started"),
      (error: unknown) => (outcome = error),
    );
    await vi.advanceTimersByTimeAsync(1_000);
    expect(outcome).toBeInstanceOf(Error);
    expect(start).toHaveBeenCalledOnce();
  });
});

describe("forgetting WalletConnect's saved data", () => {
  it("removes every key WalletConnect wrote and nothing else", async () => {
    const store = memoryStore({
      ...saved(),
      [OWN_NAMESPACES]: NAMESPACES,
      "wc@1.5:auth:0.3//authKeys": [],
      wc_storage_version: 1,
    });
    await forgetWalletConnect(store, createSafeStorage(browserLocalStorage));
    expect([...store.map.keys()]).toEqual(["wc_storage_version"]);
  });

  it("removes AppKit's mark that WalletConnect was the connected wallet, and keeps a browser wallet's", async () => {
    const MARK = "@appkit/eip155:connected_connector_id";
    localStorage.setItem(MARK, "walletConnect");
    await forgetWalletConnect(memoryStore(), createSafeStorage(browserLocalStorage));
    expect(localStorage.getItem(MARK)).toBeNull();

    localStorage.setItem(MARK, "io.metamask");
    await forgetWalletConnect(memoryStore(), createSafeStorage(browserLocalStorage));
    expect(localStorage.getItem(MARK)).toBe("io.metamask");
  });

  it("after a Disconnect ended here, removes WalletConnect's keys in boot's store and in its database", async () => {
    const boot = memoryStore({ ...saved(), wc_storage_version: 1 });
    const database = memoryStore({ ...saved(), wc_storage_version: 1 });
    await forgetAfterDisconnect(boot, database, createSafeStorage(browserLocalStorage));
    expect([...boot.map.keys()]).toEqual(["wc_storage_version"]);
    expect([...database.map.keys()]).toEqual(["wc_storage_version"]);
  });

  // The database fails where the browser refuses IndexedDB (site data blocked); boot's store then works in memory.
  it.each([
    ["fails", { getKeys: () => Promise.reject(new Error("refused")), removeItem: () => Promise.resolve() }],
    ["never answers", { getKeys: () => new Promise<string[]>(() => undefined), removeItem: () => Promise.resolve() }],
  ])("after a Disconnect ended here, forgets in each place when the other %s", async (_n, other) => {
    const storage = createSafeStorage(browserLocalStorage);
    const boot = memoryStore(saved());
    const database = memoryStore(saved());
    void forgetAfterDisconnect(boot, other, storage).catch(() => undefined);
    void forgetAfterDisconnect(other, database, storage).catch(() => undefined);
    await vi.waitFor(() => {
      expect([...boot.map.keys()]).toEqual([]);
      expect([...database.map.keys()]).toEqual([]);
    });
  });
});

let relay: Awaited<ReturnType<typeof silentRelay>>;
let SILENT_RELAY: string;

beforeAll(async () => {
  relay = await silentRelay();
  SILENT_RELAY = relay.url;
});

afterAll(() => {
  relay.close();
});

/** WalletConnect's real provider on `store`, with the app's Disconnect rule. */
async function connectedProvider(store: MemoryStore, relayUrl: string) {
  const provider = await realStart(store, relayUrl)();
  expect(provider.session?.topic).toBe(TOPIC);
  const forget = forgetIn(store);
  endDisconnectLocally(provider, forget);
  return { provider, forget };
}

describe("Disconnect of WalletConnect", () => {
  // Telling the wallet takes at most WALLET_CONNECT_DISCONNECT_MS, forgetting at most 1 s more.
  const DISCONNECT_BAR_MS = 5_000;

  it.each([
    ["its saved topic key is not hex: WalletConnect's disconnect throws", saved(NAMESPACES, "zz"), CLOSED_RELAY],
    ["its relay cannot be reached: WalletConnect's disconnect never answers", saved(), SILENT_RELAY],
  ])(
    "ends within 5 s when %s, and forgets the session, in WalletConnect's memory too",
    async (_n, plant, relay) => {
      const store = memoryStore(plant);
      const { provider, forget } = await connectedProvider(store, relay);

      const startedAt = Date.now();
      await provider.disconnect();
      expect(Date.now() - startedAt).toBeLessThan(DISCONNECT_BAR_MS);

      expect(forget).toHaveBeenCalledOnce();
      expect(provider.session).toBeUndefined();
      // Nor does the next pairing ask for that session's namespaces (walletConnectPairing.test.ts).
      expect(provider.namespaces).toBeUndefined();
      expect(provider.client.session.getAll()).toEqual([]);
      expect([...store.map.keys()].filter((key) => key.startsWith("wc@"))).toEqual([]);

      // The next Connect saves a new session: WalletConnect rewrites its whole list, and the next load restores the
      // first one in it. The old session must not be in it.
      await provider.client.session.set("aa".repeat(32), session("aa".repeat(32), NAMESPACES));
      expect((store.map.get(SESSIONS) as { topic: string }[]).map(({ topic }) => topic)).toEqual(["aa".repeat(32)]);
    },
    10_000,
  );

  it("that answers in time forgets nothing", async () => {
    const tellWallet = vi.fn(() => Promise.resolve());
    const remove = vi.fn(() => Promise.resolve());
    const provider: WalletConnectProvider = {
      session: { topic: TOPIC },
      disconnect: tellWallet,
      client: { session: { delete: remove } },
    };
    const forget = vi.fn(() => Promise.resolve());
    endDisconnectLocally(provider, forget);

    await provider.disconnect();
    expect(tellWallet).toHaveBeenCalledOnce();
    expect(forget).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("with no session is WalletConnect's own, forgetting nothing", async () => {
    const refusal = new Error("Please call connect() before enable()");
    const provider: WalletConnectProvider = {
      disconnect: () => Promise.reject(refusal),
      client: { session: { delete: () => Promise.resolve() } },
    };
    const forget = vi.fn(() => Promise.resolve());
    endDisconnectLocally(provider, forget);

    await expect(provider.disconnect()).rejects.toBe(refusal);
    expect(forget).not.toHaveBeenCalled();
  });

  it("still ends within 5 s when forgetting does not answer either", async () => {
    vi.useFakeTimers();
    const provider: WalletConnectProvider = {
      session: { topic: TOPIC },
      disconnect: () => new Promise<never>(() => undefined),
      client: { session: { delete: () => new Promise<never>(() => undefined) } },
    };
    endDisconnectLocally(provider, () => new Promise<never>(() => undefined));

    let ended = false;
    void provider.disconnect().then(() => {
      ended = true;
    });
    await vi.advanceTimersByTimeAsync(WALLET_CONNECT_DISCONNECT_MS);
    expect(ended).toBe(false);
    await vi.advanceTimersByTimeAsync(5_000 - WALLET_CONNECT_DISCONNECT_MS);
    expect(ended).toBe(true);
    expect(provider.session).toBeUndefined();
    vi.useRealTimers();
  });
});
