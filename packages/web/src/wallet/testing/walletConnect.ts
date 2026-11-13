import { createHash } from "node:crypto";
import { createServer, type AddressInfo } from "node:net";
import { vi } from "vitest";
import UniversalProvider from "@walletconnect/universal-provider";
import { createSafeStorage } from "@court/core";
import { browserLocalStorage } from "../../storage";
import { forgetWalletConnect } from "../walletConnectRecovery";

// Test support for the wallet's unit tests only: never imported by app code.

/*
 * WalletConnect's real provider (@walletconnect/universal-provider 2.23.7, its Node build) on a store in memory with
 * the API of its browser store, and a relay it cannot reach. Plants are values another build, an extension or someone
 * at the device can leave in that store: they make WalletConnect's start fail (a session's namespaces, its own
 * namespaces per session) or its Disconnect fail (a session's topic key that is not hex). As in the browser bundle, a
 * second start in the same page reuses the first one's core (WalletConnect keeps it on globalThis); call
 * resetWalletConnect before each test so that each starts from none.
 */

export const PROJECT_ID = "00000000000000000000000000000000";
export const CLOSED_RELAY = "ws://127.0.0.1:9";
const LATER = 4102444800;
export const TOPIC = "9b2bc5c4a0a4f0a5bfa2bdb6f03b3a1a8d6ad7ec2c0e5bd38e21b4c2f2a4c6e1";
export const METADATA = { name: "Kleros Court", description: "Kleros Court", url: "https://court.example", icons: [] };
export const NAMESPACES = {
  eip155: {
    accounts: ["eip155:1:0x0000000000000000000000000000000000000001"],
    chains: ["eip155:1"],
    methods: ["personal_sign"],
    events: ["accountsChanged"],
  },
};
export const SESSIONS = "wc@2:client:0.3//session";
export const KEYCHAIN = "wc@2:core:0.3//keychain";
export const OWN_NAMESPACES = `wc@2:universal_provider:/namespaces${TOPIC}`;

export function session<N>(topic: string, namespaces: N) {
  const key = "5f0cd1e1a3b1e1e1c1d1f1a1b1c1d1e1f1a1b1c1d1e1f1a1b1c1d1e1f1a1b1c1";
  return {
    topic,
    relay: { protocol: "irn" },
    expiry: LATER,
    namespaces,
    acknowledged: true,
    pairingTopic: "c14f08630a851fb4460e7c20e6fc38442651b9e3f7cb6569a65f0b50eaf3cf4f",
    requiredNamespaces: {},
    optionalNamespaces: {},
    controller: key,
    self: { publicKey: "2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b", metadata: METADATA },
    peer: { publicKey: key, metadata: METADATA },
    transportType: "relay" as const,
  };
}

/** A session WalletConnect can read, with its topic key; `topicKey` "zz" is one it cannot (not hex). */
export const saved = (namespaces: unknown = NAMESPACES, topicKey = "11".repeat(32)) => ({
  [SESSIONS]: [session(TOPIC, namespaces)],
  [KEYCHAIN]: { [TOPIC]: topicKey },
});

/**
 * WalletConnect's store in memory, with the methods its core and the app use. `refusedRemoval`: a key it lists but
 * refuses to remove, as the browser's store refuses one with a `.` segment (walletConnectStoreKeys.test.ts).
 */
export function memoryStore(entries: Record<string, unknown> = {}, { failingRead = "", refusedRemoval = "" } = {}) {
  const map = new Map<string, unknown>(Object.entries(structuredClone(entries)));
  return {
    map,
    getKeys: () => Promise.resolve([...map.keys()]),
    getEntries: () => Promise.resolve([...map.entries()]),
    getItem: (key: string) =>
      key === failingRead ? Promise.reject(new Error("store read failed")) : Promise.resolve(map.get(key)),
    setItem: (key: string, value: unknown) => {
      map.set(key, structuredClone(value));
      return Promise.resolve();
    },
    removeItem: vi.fn((key: string) => {
      if (key === refusedRemoval) return Promise.reject(new Error("store refused the removal"));
      map.delete(key);
      return Promise.resolve();
    }),
  };
}
export type MemoryStore = ReturnType<typeof memoryStore>;

const started: UniversalProvider[] = [];

/**
 * WalletConnect's start as the app makes it, on `store`; or, given a function, on a store it opens for each start, as
 * WalletConnect's core opens its own when AppKit starts it (@walletconnect/core 2.23.7 core.ts:132-134). Counts the
 * starts.
 */
type UniversalProviderStorage = NonNullable<Parameters<typeof UniversalProvider.init>[0]["storage"]>;

export function realStart(store: MemoryStore | (() => object), relayUrl = CLOSED_RELAY) {
  return vi.fn(async () => {
    const provider = await UniversalProvider.init({
      projectId: PROJECT_ID,
      metadata: METADATA,
      logger: "silent",
      // Its type is generic per call; the store holds whatever WalletConnect stored.
      storage: (typeof store === "function" ? store() : store) as unknown as UniversalProviderStorage,
      relayUrl,
    });
    started.push(provider);
    return provider;
  });
}

/** The app's forgetting of WalletConnect's data, on `store` and the page's localStorage. */
export const forgetIn = (store: MemoryStore) =>
  vi.fn(() => forgetWalletConnect(store, createSafeStorage(browserLocalStorage)));

/** The wallet's messages WalletConnect received but did not handle yet, per topic (@walletconnect/core 2.23.7). */
export const UNHANDLED = "wc@2:core:0.3//messages_withoutClientAck";

/**
 * A wallet's request on the saved session, encrypted with its topic key as the wallet sends it, keyed by its sha256 as
 * WalletConnect saves it (@walletconnect/utils hashMessage). Call it before the test starts WalletConnect.
 */
export async function walletRequest(method: string, params: unknown): Promise<Record<string, string>> {
  const provider = await realStart(memoryStore(saved()))();
  const message = await provider.client.core.crypto.encode(TOPIC, { id: 1, jsonrpc: "2.0", method, params });
  await stopStarted();
  resetWalletConnect();
  return { [createHash("sha256").update(message).digest("hex")]: message };
}

/** Each test starts with no WalletConnect core in the page. */
export function resetWalletConnect(): void {
  const global = globalThis as Record<string, unknown>;
  delete global._walletConnectCore_;
  delete global._walletConnectCore__count;
}

/** Stops the providers the test started (their heartbeat and relay connection). */
export async function stopStarted(): Promise<void> {
  // One provider after another, in the order they started.
  for (const provider of started.splice(0)) {
    provider.client.core.heartbeat.stop();
    await provider.client.core.relayer.transportClose().catch(() => undefined); // NOSONAR
  }
}

/** A relay that accepts the connection and never answers (a stalled network, a captive portal). */
export async function silentRelay(): Promise<{ url: string; close(): void }> {
  const server = createServer((socket) => socket.on("error", () => undefined));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `ws://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
    close: () => server.close(),
  };
}
