import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openWalletConnectStore, walletConnectDatabase, walletConnectStart } from "./appkit";
import {
  KEYCHAIN,
  NAMESPACES,
  realStart,
  resetWalletConnect,
  saved,
  session,
  SESSIONS,
  stopStarted,
  TOPIC,
} from "./testing/walletConnect";

/*
 * WalletConnect's store in the browser build the app bundles (@walletconnect/keyvaluestorage 1.1.1 dist/index.es.js,
 * patched in .yarn/patches): Vite picks it by its `browser` field, tests importing the package by name get the Node
 * build, so here the app's import gets the browser build. Each store, as it opens, moves WalletConnect's data from
 * localStorage into IndexedDB and reads IndexedDB from then on, unless IndexedDB is marked as moved into already
 * (`wc_storage_version`); a move that fails keeps that store on localStorage, with what it copied so far left in
 * IndexedDB. Each WalletConnect start opens a store of its own (@walletconnect/core 2.23.7 core.ts:132-134), boot opens
 * the one the app forgets through. jsdom has no IndexedDB: idb-keyval, through which that build and the app's direct
 * reader (appkit.ts walletConnectDatabase) read and write it, keeps the database's keys and values in a map here, as
 * IndexedDB returns them, per database and object store: the app's reader reaches WalletConnect's data only with the
 * names that build opens (dist/index.es.js), so a Disconnect that names another, or none, leaves the ended session there.
 */
vi.mock("@walletconnect/keyvaluestorage", () => vi.importActual("@walletconnect/keyvaluestorage/dist/index.es.js"));

const database = vi.hoisted(() => new Map<unknown, unknown>());
/** What any other idb-keyval store holds: another database or object store, or idb-keyval's default one. */
const elsewhere = vi.hoisted(() => new Map<unknown, unknown>());
/** Keys whose next read fails, once, as a read of the browser's IndexedDB can (AbortError). */
const failingOnce = vi.hoisted(() => new Set<unknown>());

vi.mock("idb-keyval", () => {
  const at = (store: unknown) => (store === "WALLET_CONNECT_V2_INDEXED_DB/keyvaluestorage" ? database : elsewhere);
  return {
    createStore: (name: string, storeName: string) => `${name}/${storeName}`,
    get: (key: unknown, store?: unknown) =>
      failingOnce.delete(key)
        ? Promise.reject(new DOMException("The transaction was aborted.", "AbortError"))
        : Promise.resolve(at(store).get(key)),
    set: (key: unknown, value: unknown, store?: unknown) => Promise.resolve(void at(store).set(key, value)),
    del: (key: unknown, store?: unknown) => Promise.resolve(void at(store).delete(key)),
    keys: (store?: unknown) => Promise.resolve([...at(store).keys()]),
  };
});

/** The keys of the session list and of the keychain in IndexedDB (the build's unstorage writes `//` as `:`). */
const SESSIONS_IN_DB = "wc@2:client:0.3:session";
const KEYCHAIN_IN_DB = "wc@2:core:0.3:keychain";
/** A key the move into IndexedDB refuses, as IndexedDB's store refuses any key with a `.` segment (unstorage 1.17.6). */
const DOT_KEY = "wc@2:poison:..";
/** A key of the app's wallet (wagmi's), which no forgetting of WalletConnect's data touches. */
const OTHER = "wagmi.recentConnectorId";

/** Saves `entries` in localStorage, in this order, as WalletConnect's store writes them there (JSON text). */
function inLocalStorage(entries: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, JSON.stringify(value));
}

/** What the database holds under `key`, as JSON text ("null" for nothing). */
const savedInDatabase = (key: string) => JSON.stringify(database.get(key) ?? null);

/** What localStorage holds, key by key. */
const localEntries = () => Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]));

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  localStorage.clear();
  database.clear();
  elsewhere.clear();
  failingOnce.clear();
  resetWalletConnect();
});

afterEach(async () => {
  await stopStarted();
  vi.restoreAllMocks();
});

describe("WalletConnect's start, when its store and boot's read different places", () => {
  it("that fails on data saved in localStorage starts once more on none, also where a move copied it", async () => {
    inLocalStorage({ [OTHER]: "io.metamask", ...saved(null), [DOT_KEY]: {} });
    expect(Object.keys(localStorage)).toEqual([OTHER, SESSIONS, KEYCHAIN, DOT_KEY]);
    const boot = openWalletConnectStore();
    // Boot's store reads localStorage: its move stopped at the dot key, after copying the session and its key.
    expect(await boot.getKeys()).toContain(DOT_KEY);
    expect([...database.keys()]).toEqual([SESSIONS_IN_DB, KEYCHAIN_IN_DB]);
    const start = realStart(openWalletConnectStore);

    const provider = await walletConnectStart(boot)(start);

    expect(start).toHaveBeenCalledTimes(2);
    expect(provider.session).toBeUndefined();
    expect(Object.keys(localStorage)).toEqual([OTHER]);
    expect(savedInDatabase(SESSIONS_IN_DB)).not.toContain(TOPIC);
    expect(savedInDatabase(KEYCHAIN_IN_DB)).not.toContain(TOPIC);
  });

  it("that fails on data saved in IndexedDB starts once more on none when boot's store stayed on localStorage", async () => {
    database
      .set("wc_storage_version", 1)
      .set(SESSIONS_IN_DB, JSON.stringify([session(TOPIC, null)]))
      .set(KEYCHAIN_IN_DB, JSON.stringify({ [TOPIC]: "11".repeat(32) }));
    // Boot's store could not read IndexedDB once: it keeps localStorage, where WalletConnect saved nothing.
    failingOnce.add("wc_storage_version");
    const boot = openWalletConnectStore();
    expect(await boot.getKeys()).toEqual([]);
    const start = realStart(openWalletConnectStore);

    const provider = await walletConnectStart(boot)(start);

    expect(start).toHaveBeenCalledTimes(2);
    expect(provider.session).toBeUndefined();
    expect(savedInDatabase(SESSIONS_IN_DB)).not.toContain(TOPIC);
    expect(savedInDatabase(KEYCHAIN_IN_DB)).not.toContain(TOPIC);
  });

  it("that works forgets nothing, in localStorage or in what a move copied into IndexedDB", async () => {
    inLocalStorage({ ...saved(), [DOT_KEY]: {} });
    const planted = localEntries();
    const boot = openWalletConnectStore();
    await boot.getKeys();
    const copied = new Map(database);
    expect([...copied.keys()]).toEqual([SESSIONS_IN_DB, KEYCHAIN_IN_DB]);
    const start = realStart(openWalletConnectStore);

    const provider = await walletConnectStart(boot)(start);

    expect(start).toHaveBeenCalledOnce();
    expect(provider.session?.topic).toBe(TOPIC);
    expect(localEntries()).toMatchObject(planted);
    for (const [key, value] of copied) expect(database.get(key)).toBe(value);
  });
});

describe("Disconnect of WalletConnect, when its store reads localStorage", () => {
  // The ended session must not come back at the next load: wagmi would restore it there with no click when it holds no
  // chain the court runs (adapter-wagmi 1.8.24 WalletConnectConnector.js isChainsStale, isAuthorized).
  it.each([
    ["its topic key is not hex: WalletConnect's disconnect throws", "zz"],
    ["its relay cannot be reached: WalletConnect's disconnect never answers", "11".repeat(32)],
  ])(
    "that ends here when %s leaves the next load no ended session, also where a move copied it",
    async (_n, topicKey) => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      inLocalStorage({ [OTHER]: "io.metamask", ...saved(NAMESPACES, topicKey), [DOT_KEY]: {} });
      const provider = await walletConnectStart(openWalletConnectStore())(realStart(openWalletConnectStore));
      expect(provider.session?.topic).toBe(TOPIC);
      // Each store's move copied the session and its key into IndexedDB, stopped at the dot key and stayed on
      // localStorage; the forget removes that key, so the next load's move works and reads IndexedDB.
      expect([...database.keys()]).toEqual([SESSIONS_IN_DB, KEYCHAIN_IN_DB]);

      await provider.disconnect();

      // Gone from IndexedDB, which is not marked as moved into: no store was opened for it.
      expect([...database.keys()]).toEqual([]);
      const nextLoad = openWalletConnectStore();
      expect(JSON.stringify((await nextLoad.getItem(SESSIONS)) ?? null)).not.toContain(TOPIC);
      expect(JSON.stringify((await nextLoad.getItem(KEYCHAIN)) ?? null)).not.toContain(TOPIC);
    },
    10_000,
  );

  // WalletConnect never writes such keys, but the next load's move takes every localStorage key holding `wc@` and writes
  // it into IndexedDB under unstorage's form of it, which drops leading `:`, `/` and `\` (unstorage 1.17.6
  // normalizeKey): there a copy is WalletConnect's session again.
  it.each([
    ["`:`, when its topic key is not hex", "zz", ":"],
    ["`:`, when its relay cannot be reached", "11".repeat(32), ":"],
    ["`/`", "zz", "/"],
    ["`\\`", "zz", "\\"],
    ["a run of them", "zz", "/:\\"],
  ])(
    "that ends here also forgets copies of the session saved under keys that start with %s",
    async (_n, topicKey, prefix) => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const data = saved(NAMESPACES, topicKey);
      inLocalStorage({
        [OTHER]: "io.metamask",
        ...data,
        [prefix + SESSIONS]: data[SESSIONS],
        [prefix + KEYCHAIN]: data[KEYCHAIN],
        [DOT_KEY]: {},
      });
      const provider = await walletConnectStart(openWalletConnectStore())(realStart(openWalletConnectStore));
      expect(provider.session?.topic).toBe(TOPIC);

      await provider.disconnect();

      expect(Object.keys(localStorage)).toEqual([OTHER]);
      const nextLoad = openWalletConnectStore();
      expect(JSON.stringify((await nextLoad.getItem(SESSIONS)) ?? null)).not.toContain(TOPIC);
      expect(JSON.stringify((await nextLoad.getItem(KEYCHAIN)) ?? null)).not.toContain(TOPIC);
    },
    10_000,
  );

  it("that ends here opens no store for it: a session saved after it is the next load's", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    // A session whose topic key is not hex: WalletConnect's disconnect throws, so the Disconnect ends here.
    inLocalStorage({ [OTHER]: "io.metamask", ...saved(NAMESPACES, "zz"), [DOT_KEY]: {} });
    const provider = await walletConnectStart(openWalletConnectStore())(realStart(openWalletConnectStore));
    expect(provider.session?.topic).toBe(TOPIC);
    await provider.disconnect();
    expect(provider.session).toBeUndefined();

    // The next Connect in the same load: WalletConnect saves the new session and its key through its own store.
    const NEW = "aa".repeat(32);
    await provider.client.core.crypto.keychain.set(NEW, "22".repeat(32));
    await provider.client.session.set(NEW, session(NEW, NAMESPACES));

    const nextLoad = openWalletConnectStore();
    const sessions = (await nextLoad.getItem(SESSIONS)) as { topic: string }[] | undefined;
    expect(sessions?.map(({ topic }) => topic)).toEqual([NEW]);
  });
});

describe("WalletConnect's IndexedDB database, read without a store", () => {
  it("lists its text keys only, as its store does: an IndexedDB key can also be a number, a date or a list", async () => {
    database.set(KEYCHAIN_IN_DB, "{}").set(7, "seven").set("wc_storage_version", 1);
    expect(await walletConnectDatabase().getKeys()).toEqual([KEYCHAIN_IN_DB, "wc_storage_version"]);
  });
});
