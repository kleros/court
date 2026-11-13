import type { SafeStorage } from "@court/core";

/*
 * WalletConnect's saved data can stop it (D-01, D-55: WalletConnect is one of the wallets). A value it cannot read can
 * make its start fail, on every load, or its Disconnect fail, on every click, and anything that can write the court
 * origin's storage can leave one: another build of this app (WalletConnect's format changes across versions), an
 * extension, someone at the device. Instead of a check per stored value, the app runs WalletConnect's start (AppKit's,
 * appkit.ts walletConnectStart) and forgets its saved data when the start or a Disconnect fails, so it works again in
 * the same load.
 */

/** WalletConnect's store (@walletconnect/keyvaluestorage 1.1.1 KeyValueStorage): the part used to forget its data. */
export interface WalletConnectKeys {
  getKeys(): Promise<string[]>;
  removeItem(key: string): Promise<void>;
}

/**
 * How long Disconnect waits for WalletConnect to tell the wallet, and then at most FORGET_MS to forget the session
 * here. A browser wallet's part takes at most 0.1 s (@wagmi/core 2.22.1 connectors/injected.js:178-189), so Disconnect
 * ends within 5 s (the bar for Disconnect). A start that failed also forgets within FORGET_MS.
 */
export const WALLET_CONNECT_DISCONNECT_MS = 3_000;
const FORGET_MS = 1_000;

/** The id AppKit gives WalletConnect's connector (appkit-common 1.8.24 ConstantsUtil CONNECTOR_ID.WALLET_CONNECT). */
const WALLET_CONNECT = "walletConnect";
/** The connector AppKit restores on load (appkit-controllers 1.8.24 StorageUtil.js:172-183, SafeLocalStorage.js:35). */
const APPKIT_CONNECTOR = "@appkit/eip155:connected_connector_id";

/**
 * AppKit's mark saying WalletConnect was the connected wallet, so a load whose WalletConnect lost its session is not
 * left half-connected: with it AppKit restores WalletConnect, finds no session, and can keep its account "connecting"
 * for the whole load (appkit-base-client.js:1196-1213; :1257-1305 sets no other state). Only WalletConnect's own mark:
 * a browser wallet connected before is still restored. wagmi's marks need nothing: its reconnect asks the provider,
 * which has no session (adapter-wagmi WalletConnectConnector.js isAuthorized).
 */
function forgetWalletConnectMark(storage: SafeStorage): void {
  if (storage.read(APPKIT_CONNECTOR) === WALLET_CONNECT) storage.remove(APPKIT_CONNECTOR);
}

/**
 * WalletConnect's keys (they start with `wc@`: wc@2:*, wc@1.5:*), and the keys that become one in IndexedDB: a store,
 * as it opens, moves every localStorage key holding `wc@` into IndexedDB under unstorage's form of it, which drops
 * leading `:`, `/` and `\` (forgetBeforeRetry; unstorage 1.17.6 normalizeKey). WalletConnect writes no such key, but a
 * copy of a session saved under one would be its session again at the next load's move, after a Disconnect.
 */
const WALLET_CONNECT_KEY = /^[:/\\]*wc@/;

/**
 * Removes everything WalletConnect saved (WALLET_CONNECT_KEY) and AppKit's mark above. A key the store refuses to
 * remove does not stop the rest: the browser's store lists a key with a `.` segment but refuses to remove it (unstorage
 * 1.17.6 index.mjs:53-58), as it refuses to write or read one, so WalletConnect never reads it.
 */
export async function forgetWalletConnect(store: WalletConnectKeys, storage: SafeStorage): Promise<void> {
  forgetWalletConnectMark(storage);
  await removeWalletConnectKeys(store);
}

async function removeWalletConnectKeys(store: WalletConnectKeys): Promise<void> {
  const keys = (await store.getKeys()).filter((key) => WALLET_CONNECT_KEY.test(key));
  await Promise.allSettled(keys.map((key) => store.removeItem(key)));
}

/**
 * Forgets WalletConnect's saved data before its start runs again, also where that start reads it. Each start opens a
 * store of its own (@walletconnect/core 2.23.7 core.ts:132-134; AppKit passes none), and a store, as it opens, moves
 * WalletConnect's data from localStorage into IndexedDB and reads IndexedDB from then on, unless IndexedDB is marked as
 * moved into already (@walletconnect/keyvaluestorage 1.1.1, patched). A move that fails, at a key IndexedDB refuses (a
 * `.` segment) or on a read IndexedDB failed, keeps that store on localStorage, leaving what it copied in IndexedDB. So
 * boot's store can read localStorage while the next start's reads IndexedDB, where it finds the same data: the data is
 * forgotten through boot's store, and then through a store opened after that, which opens as the next start's will.
 */
export async function forgetBeforeRetry(
  store: WalletConnectKeys,
  openStore: () => WalletConnectKeys,
  storage: SafeStorage,
): Promise<void> {
  await forgetWalletConnect(store, storage);
  await removeWalletConnectKeys(openStore());
}

/**
 * Forgets WalletConnect's saved data after a Disconnect ended here: through boot's store, and in WalletConnect's
 * IndexedDB database read without a store (`database`). Boot's store can read localStorage while IndexedDB holds a copy
 * of the session that a move left there (forgetBeforeRetry); forgetting through boot's store removes the key that move
 * stopped at, so the next load's store moves and reads IndexedDB, and would restore the ended session from that copy.
 * Not through a store opened now: as it opens it can move WalletConnect's data into IndexedDB and mark IndexedDB as
 * moved into, and the next load would then read IndexedDB while this load's WalletConnect still writes localStorage,
 * losing a session connected after the Disconnect. Neither place waits for the other: IndexedDB fails where the
 * browser refuses it (site data blocked), and boot's store then works in memory.
 */
export async function forgetAfterDisconnect(
  store: WalletConnectKeys,
  database: WalletConnectKeys,
  storage: SafeStorage,
): Promise<void> {
  await Promise.all([forgetWalletConnect(store, storage), removeWalletConnectKeys(database)]);
}

/** The part of WalletConnect's core (@walletconnect/core 2.23.7 Core) stopped here. */
interface WalletConnectCore {
  readonly heartbeat: { stop(): void };
  storage: {
    getKeys(): Promise<string[]>;
    getEntries(): Promise<[string, unknown][]>;
    getItem(key: string): Promise<unknown>;
    setItem(key: string, value: unknown): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  readonly relayer: {
    request: () => Promise<unknown>;
    transportClose(): Promise<void>;
    on(event: "relayer_connect", listener: () => void): void;
  };
}

/**
 * Stops the WalletConnect of a start that failed, before the retry. WalletConnect keeps one core per page on
 * globalThis (@walletconnect/core 2.23.7 core.ts:235-268, under `_walletConnectCore_` as the app sets no storage
 * prefix) and every later start reuses it, with the failed start's client still attached: that client then took the
 * wallet's messages on the new session too, answered them with errors (the wallet's session updates failed) and threw
 * at every ping. Its core is stopped and dropped, so the retry starts a fresh one and the failed one takes no more
 * messages: its heartbeat stops, its requests to the relay are refused, and its relay connection is closed now and
 * whenever it opens. Closing ends only a connection that is open (relayer.ts:276-282): one still opening when the start
 * failed opens afterwards, and the browser's online event opens it again (:131-135, :625-638); a request opens it too
 * (@walletconnect/jsonrpc-provider requestStrict), even on a connection the relayer no longer listens to. Left open,
 * the failed client acted on the wallet's messages for the old session and rewrote WalletConnect's saved sessions
 * without the retry's. It does so without the relay too: a second after its start it handles the wallet's messages
 * saved as received but not handled (sign-client 2.23.7 engine.ts:188-193). So its writes to the store go nowhere:
 * its sessions, keys and the rest are written through the core's `storage`, read at each write (core store.ts:152,
 * keychain.ts:75), and replacing it on the failed core leaves the retry's core and that store itself as they are.
 */
function stopFailedWalletConnect(): void {
  const global = globalThis as { _walletConnectCore_?: WalletConnectCore };
  const core = global._walletConnectCore_;
  delete global._walletConnectCore_;
  if (core === undefined) return;
  core.heartbeat.stop();
  core.relayer.request = () => Promise.reject(new Error("This WalletConnect was stopped: its start failed."));
  const close = () => {
    core.relayer.transportClose().catch(() => undefined);
  };
  core.relayer.on("relayer_connect", close);
  close();
  const store = core.storage;
  core.storage = {
    getKeys: () => store.getKeys(),
    getEntries: () => store.getEntries(),
    getItem: (key) => store.getItem(key),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
  };
}

/**
 * Starts WalletConnect; when that fails, stops the failed one, forgets its saved data and starts it once more, so the
 * WalletConnect row works in the same load. A second failure, or a failure to forget within FORGET_MS, rejects: AppKit
 * keeps that for the load as it kept its own start's failure, with no WalletConnect row and no further start
 * (appkit-base-client.js 1587-1611). Bounded because AppKit's Connect window waits for this start, browser wallets
 * included (connectModal, appkit.ts). A start that succeeds never forgets anything: a session saved while the relay is
 * down, or the device offline, stays.
 */
export async function startWalletConnect<P>(start: () => Promise<P>, forget: () => Promise<void>): Promise<P> {
  try {
    return await start();
  } catch (error) {
    console.warn("WalletConnect could not start from its saved data; it starts again without it.", error);
  }
  stopFailedWalletConnect();
  await within(forget(), FORGET_MS);
  return start();
}

/** Rejects once `ms` passed without `work` settling; a later failure of `work` is then ignored. */
function within<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`no answer in ${String(ms)} ms`));
    }, ms);
  });
  work.catch(() => undefined);
  return Promise.race([work, late]).finally(() => {
    clearTimeout(timer);
  });
}

/** The part of WalletConnect's UniversalProvider (2.23.7) the app's rules use. */
export interface WalletConnectProvider {
  session?: { readonly topic: string };
  namespaces?: unknown;
  disconnect(): Promise<void>;
  readonly client: {
    readonly session: { delete(topic: string, reason: { message: string; code: number }): Promise<void> };
  };
}

/**
 * WalletConnect's provider keeps namespaces with no session too: those saved with none, read at its start
 * (UniversalProvider.ts:266-268, :582-585), or a session's, after a Disconnect ended here. Its next pairing asks the
 * wallet for them as required (:193-197; Connect sets only the optional ones, :434-446), and its sign client refuses
 * namespaces it cannot read before it shows a pairing address (sign-client 2.23.7 engine.ts:231, :2844-2882), on every
 * Connect of the load and, for saved ones, of every load. So with no session they are dropped, as WalletConnect's own
 * Disconnect drops them (cleanup, :563-568): Connect then pairs as on a first visit. In memory only: nothing saved is
 * removed after a start that works.
 */
export function dropNamespacesWithoutSession(provider: WalletConnectProvider): void {
  if (provider.session === undefined) provider.namespaces = undefined;
}

/** WalletConnect's reason for a session the user ended (@walletconnect/utils getSdkError("USER_DISCONNECTED")). */
const USER_DISCONNECTED = { message: "User disconnected.", code: 6000 };

/**
 * Makes the provider's Disconnect end even when WalletConnect cannot tell the wallet: its disconnect throws on a saved
 * session it cannot read (a topic key that is not hex), and gives no answer at all while its relay cannot be reached.
 * The session is then forgotten here, so AppKit and wagmi end their own Disconnect as usual and the next Connect pairs
 * anew; telling the wallet is best effort. Forgotten in WalletConnect's memory too: it rewrites its whole list of
 * sessions at the next change, and the next load would restore the first one.
 */
export function endDisconnectLocally(provider: WalletConnectProvider, forget: () => Promise<void>): void {
  const tellWallet = provider.disconnect.bind(provider);
  provider.disconnect = async () => {
    const session = provider.session;
    if (session === undefined) return tellWallet();
    try {
      await within(tellWallet(), WALLET_CONNECT_DISCONNECT_MS);
    } catch (error) {
      console.warn("WalletConnect could not end the session with the wallet; it is ended here only.", error);
      provider.session = undefined;
      dropNamespacesWithoutSession(provider);
      const forgetSession = async () => {
        await provider.client.session.delete(session.topic, USER_DISCONNECTED);
        await forget();
      };
      await within(forgetSession(), FORGET_MS).catch((reason: unknown) => {
        console.error("WalletConnect's saved data could not be removed.", reason);
      });
    }
  };
}
