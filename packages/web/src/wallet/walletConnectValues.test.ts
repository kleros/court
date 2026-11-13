import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readEnv } from "@court/core";
import { initWallet, readOnlyWagmiConfig, type WalletSetup } from "./init";
import {
  dropUnusableWalletConnectValues,
  WALLET_CONNECT_CHECK_MS,
  type WalletConnectStore,
} from "./walletConnectValues";

// AppKit replaced, to see what boot hands it: its real start is covered by appkit.test.ts.
const appKit = vi.hoisted(() => ({
  store: undefined as WalletConnectStore | undefined,
  startAppKit: vi.fn<() => WalletSetup>(),
}));
vi.mock("./appkit", () => ({
  openWalletConnectStore: () => appKit.store,
  walletConnectStart: vi.fn(),
  startAppKit: appKit.startAppKit,
}));

/** WalletConnect's store in memory, as its core keeps it in Node (the `:memory:` database). */
function memoryStore(entries: Record<string, unknown> = {}) {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getKeys: () => Promise.resolve([...map.keys()]),
    getEntries: () => Promise.resolve([...map.entries()]),
    getItem: (key: string) => Promise.resolve(map.get(key)),
    setItem: (key: string, value: unknown) => Promise.resolve(void map.set(key, value)),
    removeItem: vi.fn((key: string) => Promise.resolve(void map.delete(key))),
  };
}

interface RecordStore {
  readonly storageKey: string;
  readonly length: number;
  init(): Promise<void>;
}
interface Subscriber extends RecordStore {
  start(): Promise<void>;
}
interface SignClient {
  readonly core: {
    readonly pairing: { readonly pairings: RecordStore };
    readonly history: RecordStore;
    readonly expirer: RecordStore;
    readonly crypto: {
      readonly keychain: { readonly storageKey: string };
      init(): Promise<void>;
      getClientId(): Promise<string>;
    };
    readonly relayer: {
      readonly subscriber: Subscriber;
      readonly connected: boolean;
      request(request: unknown): Promise<unknown>;
      transportOpen(): Promise<void>;
    };
    readonly heartbeat: { pulse(): void; stop(): void };
  };
  readonly session: RecordStore;
  readonly proposal: RecordStore;
  readonly pendingRequest: RecordStore;
  readonly auth: {
    readonly authKeys: RecordStore;
    readonly pairingTopics: RecordStore;
    readonly requests: RecordStore;
  };
  /** Its start, as `SignClient.init` runs it: the core's, then the client's stores and engine. */
  initialize(): Promise<void>;
}

/*
 * The WalletConnect AppKit runs: AppKit's @walletconnect/universal-provider loads its own sign-client 2.23.7 (the
 * top-level @walletconnect/sign-client is another package's 2.21.1), and that one the core 2.23.7.
 */
const fromProvider = createRequire(createRequire(import.meta.url).resolve("@walletconnect/universal-provider"));
const { SignClient } = fromProvider("@walletconnect/sign-client") as {
  SignClient: new (options: { projectId: string; logger: string; storage: unknown }) => SignClient;
};

/** Stores whose stored list of records, when of another shape, stops the start (core, sign-client, its auth part). */
const STORES = {
  pairing: (client: SignClient) => client.core.pairing.pairings,
  history: (client: SignClient) => client.core.history,
  expirer: (client: SignClient) => client.core.expirer,
  session: (client: SignClient) => client.session,
  proposal: (client: SignClient) => client.proposal,
  request: (client: SignClient) => client.pendingRequest,
  "auth keys": (client: SignClient) => client.auth.authKeys,
  "auth pairing topics": (client: SignClient) => client.auth.pairingTopics,
  "auth requests": (client: SignClient) => client.auth.requests,
};
type StoreName = keyof typeof STORES;
const STORE_NAMES = Object.keys(STORES) as StoreName[];

// Each value is one test's only argument (it.each would spread a list).
const one = (values: unknown[]) => values.map((value) => [value]);

const newClient = (storage: unknown) => new SignClient({ projectId: "unit-test", logger: "silent", storage });

/** The named store of a new client over `storage`, not started yet (a store restores once). */
const storeOf = (name: StoreName, storage: unknown): RecordStore => STORES[name](newClient(storage));

/**
 * WalletConnect's whole start over `storage`, as AppKit starts it; resolves to the started client. The relay connection
 * its core then opens in the background is not opened: unit tests make no network requests.
 */
async function start(storage: unknown): Promise<SignClient> {
  const client = newClient(storage);
  vi.spyOn(client.core.relayer, "transportOpen").mockResolvedValue(undefined);
  try {
    await client.initialize();
  } finally {
    client.core.heartbeat.stop();
  }
  return client;
}

// As WalletConnect stored them in a browser for a pairing it proposed (court-lab capture).
const PAIRINGS = [
  {
    topic: "c14f08630a851fb4460e7c20e6fc38442651b9e3f7cb6569a65f0b50eaf3cf4f",
    expiry: 1794390879,
    relay: { protocol: "irn" },
    active: false,
  },
];
const EXPIRATIONS = [
  { target: "topic:c14f08630a851fb4460e7c20e6fc38442651b9e3f7cb6569a65f0b50eaf3cf4f", expiry: 1794390879 },
  { target: "id:1794390579237737", expiry: 1794390879 },
];

/** 2100-01-01, so these records never expire while the tests run. */
const LATER = 4102444800;
const COURT = { name: "Kleros Court", description: "Kleros Court", url: "https://court.example", icons: [] };
const NAMESPACES = { eip155: { chains: ["eip155:1"], methods: ["personal_sign"], events: ["accountsChanged"] } };
/*
 * Hand-built in the shape sign-client 2.23.7 writes them (no capture: a session needs a wallet that accepts the
 * pairing): a session as its engine settles one (engine.ts:2200-2224), a proposal as its connect makes one
 * (engine.ts:288-337). Its stores load only records with these fields (utils isSessionStruct, isProposalStruct).
 */
const SESSION = {
  topic: "9b2bc5c4a0a4f0a5bfa2bdb6f03b3a1a8d6ad7ec2c0e5bd38e21b4c2f2a4c6e1",
  relay: { protocol: "irn" },
  expiry: LATER,
  namespaces: {
    eip155: {
      accounts: ["eip155:1:0x0000000000000000000000000000000000000001"],
      chains: ["eip155:1"],
      methods: ["personal_sign"],
      events: ["accountsChanged"],
    },
  },
  acknowledged: true,
  pairingTopic: PAIRINGS[0]?.topic,
  requiredNamespaces: {},
  optionalNamespaces: NAMESPACES,
  controller: "5f0cd1e1a3b1e1e1c1d1f1a1b1c1d1e1f1a1b1c1d1e1f1a1b1c1d1e1f1a1b1c1",
  self: { publicKey: "2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b", metadata: COURT },
  peer: {
    publicKey: "5f0cd1e1a3b1e1e1c1d1f1a1b1c1d1e1f1a1b1c1d1e1f1a1b1c1d1e1f1a1b1c1",
    metadata: { name: "A wallet", description: "A wallet", url: "https://wallet.example", icons: [] },
  },
  transportType: "relay",
};
const PROPOSAL = {
  requiredNamespaces: {},
  optionalNamespaces: NAMESPACES,
  relays: [{ protocol: "irn" }],
  proposer: { publicKey: "7c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d", metadata: COURT },
  expiryTimestamp: LATER,
  pairingTopic: PAIRINGS[0]?.topic,
  id: 1794390579237737,
};

beforeEach(() => {
  // A core per client: the library otherwise shares one per page, restored once.
  vi.stubEnv("DISABLE_GLOBAL_CORE", "true");
  vi.stubGlobal("fetch", () => Promise.reject(new Error("unit tests make no network requests")));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("WalletConnect's stored records", () => {
  const unusable: [StoreName, unknown][] = [
    ...STORE_NAMES.flatMap((name): [StoreName, unknown][] => [
      [name, "zz"],
      [name, { length: 1 }],
    ]),
    ["history", [null]],
    ["expirer", [null]],
  ];
  it.each(unusable)(
    "a stored %s list of another shape is removed, so WalletConnect starts: %j",
    async (name, value) => {
      const storage = memoryStore();
      const key = storeOf(name, storage).storageKey;
      storage.map.set(key, value);
      await expect(storeOf(name, storage).init()).rejects.toThrow(TypeError);

      await dropUnusableWalletConnectValues(storage);
      expect(storage.map.has(key)).toBe(false);
      await expect(storeOf(name, storage).init()).resolves.toBeUndefined();
    },
  );

  it.each([
    ["pairing", PAIRINGS],
    ["expirer", EXPIRATIONS],
    ...STORE_NAMES.map((name): [StoreName, unknown] => [name, []]),
  ] as [StoreName, unknown][])("keeps the %s records WalletConnect wrote: %j", async (name, value) => {
    const storage = memoryStore();
    const store = storeOf(name, storage);
    storage.map.set(store.storageKey, value);

    await dropUnusableWalletConnectValues(storage);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.map.get(store.storageKey)).toBe(value);
    await expect(store.init()).resolves.toBeUndefined();
  });
});

/**
 * One beat of a started WalletConnect's heartbeat (every 5 s in a page) while its relay connection is open: its core
 * checks the stored expirations only then (core 2.23.7 expirer.ts:192-196). The connection is not opened: unit tests make
 * no network requests.
 */
function heartbeatWhileConnected(client: SignClient): void {
  vi.spyOn(client.core.relayer, "connected", "get").mockReturnValue(true);
  client.core.heartbeat.pulse();
}

describe("WalletConnect's stored pairings, sessions, proposals and expirations", () => {
  const recordKey = (name: "pairing" | "session" | "proposal" | "expirer") => storeOf(name, memoryStore()).storageKey;
  /** A stored object that cannot be turned into a number: its own toString is not a function. */
  const NOT_A_TIME = { toString: null };

  it.each([
    ["pairing", { ...PAIRINGS[0], expiry: NOT_A_TIME }],
    ["session", { ...SESSION, expiry: NOT_A_TIME }],
    ["proposal", { ...PROPOSAL, expiryTimestamp: NOT_A_TIME }],
  ] as const)("a stored %s whose expiry is not a number is removed, so WalletConnect starts", async (name, record) => {
    const key = recordKey(name);
    const storage = memoryStore({ [key]: [record] });
    await expect(start(storage)).rejects.toThrow(TypeError);

    await dropUnusableWalletConnectValues(storage);
    expect(storage.map.has(key)).toBe(false);
    await expect(start(storage)).resolves.toBeDefined();
  });

  it("a stored expiration whose expiry is not a number is removed, so WalletConnect's heartbeat runs", async () => {
    const key = recordKey("expirer");
    const storage = memoryStore({ [key]: [{ ...EXPIRATIONS[0], expiry: NOT_A_TIME }] });
    const client = await start(storage);
    expect(() => {
      heartbeatWhileConnected(client);
    }).toThrow(TypeError);

    await dropUnusableWalletConnectValues(storage);
    expect(storage.map.has(key)).toBe(false);
    const restarted = await start(storage);
    expect(() => {
      heartbeatWhileConnected(restarted);
    }).not.toThrow();
  });

  it("keeps them as WalletConnect writes them, and starts with them", async () => {
    const values = {
      // The captured pairing, not yet expired: WalletConnect deletes an expired one at start.
      [recordKey("pairing")]: PAIRINGS.map((pairing) => ({ ...pairing, expiry: LATER })),
      [recordKey("session")]: [SESSION],
      [recordKey("proposal")]: [PROPOSAL],
      // The session's key: WalletConnect deletes a stored session it has no key for.
      [newClient(memoryStore()).core.crypto.keychain.storageKey]: { [SESSION.topic]: "11".repeat(32) },
    };
    const storage = memoryStore(values);

    await dropUnusableWalletConnectValues(storage);
    expect(storage.removeItem).not.toHaveBeenCalled();
    const client = await start(storage);
    expect([client.core.pairing.pairings.length, client.session.length, client.proposal.length]).toEqual([1, 1, 1]);
  });
});

describe("WalletConnect's stored keychain", () => {
  const keychainKey = () => newClient(memoryStore()).core.crypto.keychain.storageKey;
  /** The id of WalletConnect's client for the relay: it signs each request to the relay and each pairing with it. */
  async function clientId(storage: unknown): Promise<string> {
    const client = newClient(storage);
    await client.core.crypto.init();
    return client.core.crypto.getClientId();
  }

  it.each(
    one([
      { client_ed25519_seed: "zz" },
      { client_ed25519_seed: "00" },
      { client_ed25519_seed: 5 },
      { client_ed25519_seed: null },
      { client_ed25519_seed: "AB".repeat(32) },
      null,
    ]),
  )("a stored keychain WalletConnect cannot sign with is removed, so it makes a new client key: %j", async (value) => {
    const key = keychainKey();
    const storage = memoryStore({ [key]: value });
    await expect(clientId(storage)).rejects.toThrow();

    await dropUnusableWalletConnectValues(storage);
    expect(storage.map.has(key)).toBe(false);
    await expect(clientId(storage)).resolves.toMatch(/^did:key:/);
    expect(storage.map.has(key)).toBe(true);
  });

  it("keeps the keychain WalletConnect wrote, and its client key", async () => {
    const key = keychainKey();
    const storage = memoryStore();
    const id = await clientId(storage);
    const keychain = storage.map.get(key);

    await dropUnusableWalletConnectValues(storage);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.map.get(key)).toBe(keychain);
    await expect(clientId(storage)).resolves.toBe(id);
  });

  it("starts at once after removing it, dropping the stored sessions it held the keys of", async () => {
    const sessionKey = storeOf("session", memoryStore()).storageKey;
    const storage = memoryStore({
      [keychainKey()]: { client_ed25519_seed: "zz", [SESSION.topic]: "11".repeat(32) },
      [sessionKey]: [SESSION],
    });

    await dropUnusableWalletConnectValues(storage);
    const client = await start(storage);
    expect(client.session.length).toBe(0);
    await expect(client.core.crypto.getClientId()).resolves.toMatch(/^did:key:/);
  });
});

describe("WalletConnect's stored subscriptions", () => {
  /** The key WalletConnect's subscriber stores them under (a client per test, see beforeEach). */
  const subscriptionsKey = () => newClient(memoryStore()).core.relayer.subscriber.storageKey;

  /**
   * What WalletConnect's relayer does with the stored subscriptions once its connection to the relay opens (core 2.23.7
   * relayer.ts:419, subscriber.start): restore them, then subscribe to their topics again. The relay is answered here;
   * returns the requests sent to it.
   */
  async function resubscribe(storage: unknown): Promise<unknown[]> {
    const client = newClient(storage);
    const requests: unknown[] = [];
    vi.spyOn(client.core.relayer, "request").mockImplementation((request) => {
      requests.push(request);
      return Promise.resolve(true);
    });
    await client.core.crypto.init();
    await client.core.relayer.subscriber.init();
    await client.core.relayer.subscriber.start();
    return requests;
  }

  // As WalletConnect stored it in a browser for the pairing above (court-lab capture).
  const SUBSCRIPTION = {
    topic: "c14f08630a851fb4460e7c20e6fc38442651b9e3f7cb6569a65f0b50eaf3cf4f",
    relay: { protocol: "irn" },
    id: "0df5b5257ad0d2260a2e165bb2fb14811432b30609b66453fa86bb73d62a849b",
  };

  it.each(
    one(["zz", [null], [{}], [{ ...SUBSCRIPTION, relay: undefined }], [{ ...SUBSCRIPTION, relay: { protocol: "x" } }]]),
  )("a stored subscription list WalletConnect cannot resubscribe is removed, so it can: %j", async (value) => {
    const key = subscriptionsKey();
    const storage = memoryStore({ [key]: value });
    await expect(resubscribe(storage)).rejects.toThrow();

    await dropUnusableWalletConnectValues(storage);
    expect(storage.map.has(key)).toBe(false);
    await expect(resubscribe(storage)).resolves.toEqual([]);
  });

  it.each(one([5, {}, { a: 5 }, [{ ...SUBSCRIPTION, topic: 5 }], [{ ...SUBSCRIPTION, id: undefined }]]))(
    "a stored subscription value of another shape is removed: %j",
    async (value) => {
      const key = subscriptionsKey();
      const storage = memoryStore({ [key]: value });
      await dropUnusableWalletConnectValues(storage);
      expect(storage.map.has(key)).toBe(false);
    },
  );

  it.each([
    [[SUBSCRIPTION], [{ method: "irn_batchSubscribe", params: { topics: [SUBSCRIPTION.topic] } }]],
    [[], []],
  ])("keeps the subscriptions WalletConnect wrote, and it resubscribes them: %j", async (value, requests) => {
    const key = subscriptionsKey();
    const storage = memoryStore({ [key]: value });
    await dropUnusableWalletConnectValues(storage);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.map.get(key)).toBe(value);
    await expect(resubscribe(storage)).resolves.toEqual(requests);
  });

  it.each(["iridium", "waku"])(
    "keeps subscriptions on another relay protocol WalletConnect knows: %s",
    async (protocol) => {
      const key = subscriptionsKey();
      const value = [{ ...SUBSCRIPTION, relay: { protocol } }];
      const storage = memoryStore({ [key]: value });
      await dropUnusableWalletConnectValues(storage);
      expect(storage.map.get(key)).toBe(value);
      await expect(resubscribe(storage)).resolves.toEqual([
        { method: `${protocol}_batchSubscribe`, params: { topics: [SUBSCRIPTION.topic] } },
      ]);
    },
  );
});

describe("boot with a Reown project id", () => {
  const ENV = readEnv({ REACT_APP_WALLETCONNECT_PROJECT_ID: "5ca1ab1e5ca1ab1e5ca1ab1e5ca1ab1e" });
  const setup: WalletSetup = { config: readOnlyWagmiConfig(ENV), modal: { openConnect: () => Promise.resolve() } };

  it("removes them before AppKit starts WalletConnect, and starts it", async () => {
    const pairingKey = storeOf("pairing", memoryStore()).storageKey;
    const expirerKey = storeOf("expirer", memoryStore()).storageKey;
    const storage = memoryStore({ [pairingKey]: "zz", [expirerKey]: EXPIRATIONS });
    appKit.store = storage;
    let storedAtStart = new Map<string, unknown>();
    appKit.startAppKit.mockImplementation(() => {
      storedAtStart = new Map(storage.map);
      return setup;
    });

    await expect(initWallet(ENV, "https://court.example")).resolves.toBe(setup);
    expect(storedAtStart).toEqual(new Map([[expirerKey, EXPIRATIONS]]));
  });

  // The page renders only after boot: neither it nor the browser wallets may wait on WalletConnect's store.
  it.each([
    ["fails", () => Promise.reject(new Error("The operation failed for reasons unrelated to the database itself."))],
    ["never answers", () => new Promise<never>(() => undefined)],
  ])("still starts AppKit, so Connect is offered, when WalletConnect's store %s", async (_name, getItem) => {
    vi.useFakeTimers();
    const read = vi.fn(getItem);
    appKit.store = { getItem: read, removeItem: vi.fn(() => Promise.resolve()) };
    appKit.startAppKit.mockReturnValue(setup);

    const wallet = initWallet(ENV, "https://court.example");
    await vi.waitFor(() => {
      expect(read).toHaveBeenCalled();
    });
    await vi.advanceTimersByTimeAsync(WALLET_CONNECT_CHECK_MS);
    await expect(wallet).resolves.toBe(setup);
  });

  // Boot lets AppKit start WalletConnect itself when the store does not answer (init.ts).
  it.each([
    ["answers", () => Promise.resolve(undefined), true],
    ["fails", () => Promise.reject(new Error("The operation failed.")), true],
    ["never answers", () => new Promise<never>(() => undefined), false],
  ])("tells boot whether WalletConnect's store answered in time: it %s", async (_name, getItem, answered) => {
    vi.useFakeTimers();
    const checked = dropUnusableWalletConnectValues({ getItem, removeItem: vi.fn(() => Promise.resolve()) });
    await vi.advanceTimersByTimeAsync(WALLET_CONNECT_CHECK_MS);
    await expect(checked).resolves.toBe(answered);
  });
});
