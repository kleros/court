import { createStorage, deserialize, type Storage } from "wagmi";
import { createSafeStorage, isCourtChainId, isPlainObject } from "@court/core";
import { browserLocalStorage } from "../storage";

/**
 * wagmi's state, the last wallet used and the chains AppKit's WalletConnect connector last asked a wallet for, under
 * wagmi's default `wagmi.` prefix.
 */
const STATE_KEY = "wagmi.store";
const RECENT_CONNECTOR_KEY = "wagmi.recentConnectorId";
const REQUESTED_CHAINS_KEY = "wagmi.walletConnect.requestedChains";

/** A stored value read with wagmi's own deserializer (its reviver turns nested `__type` objects into a Map or bigint). */
function parse(text: string): unknown {
  try {
    return deserialize(text);
  } catch {
    return undefined;
  }
}

const isText = (value: unknown): value is string => typeof value === "string";

/**
 * One stored connection as wagmi writes it (@wagmi/core 2.22.1 createConfig.js:160-173): the accounts, the chain id and
 * the connector's id, name, type and uid, each of that type. wagmi uses them unchecked: getAccount on the first render
 * (accounts, chainId), reconnect on load (each connector id becomes an object key, actions/reconnect.js:32-35), and
 * the loaded entries stay in its state until reconnect replaces them.
 * The chain must also be one the court runs. While wagmi reconnects, the loaded chain is the account's chain, and
 * AppKit took another one as its network and opened its "Switch Network" window, which cannot be closed, with no
 * wallet connected (a wallet locked while on Polygon). Not restoring it loses nothing: reconnect asks the wallet for
 * its chain, and a wallet still connected on another chain gets AppKit's window as before.
 */
function isConnection(value: unknown): boolean {
  if (!isPlainObject(value) || !isPlainObject(value.connector)) return false;
  const { accounts, chainId, connector } = value;
  return (
    Array.isArray(accounts) &&
    accounts.every(isText) &&
    isCourtChainId(chainId) &&
    [connector.id, connector.name, connector.type, connector.uid].every(isText)
  );
}

/**
 * Whether a stored state has the form wagmi writes: `{state: {connections: Map(uid -> connection), current: uid |
 * null, ...}, version}`. Any other form threw: the account read on the first render calls `connections.get` (the page
 * rendered nothing), and a connector id that cannot be read as text made reconnect throw before it tried any wallet,
 * leaving the stored connections in place, where Disconnect then threw on them. The state's own chain id is wagmi's
 * to check (createConfig.js:195-203).
 */
function isWagmiState(text: string): boolean {
  const value = parse(text);
  if (!isPlainObject(value) || !isPlainObject(value.state)) return false;
  const { connections, current } = value.state;
  return (
    connections instanceof Map &&
    [...connections].every(([uid, connection]) => isText(uid) && isConnection(connection)) &&
    (current === null || isText(current))
  );
}

/**
 * Whether the requested chains have the form the WalletConnect connector writes: a list of chain ids. It reads them
 * before every session proposal and spreads them into a Set (@reown/appkit-adapter-wagmi 1.8.24
 * WalletConnectConnector.js:46, :321-323): any other form threw there, so the WalletConnect row showed no QR code, on
 * every load, as nothing rewrites them before a pairing. Removed, they read as none asked yet, as before a first
 * Connect.
 */
function isChainIdList(text: string): boolean {
  const value = parse(text);
  return Array.isArray(value) && value.every((chainId) => typeof chainId === "number");
}

/**
 * Whether `key` is one of wagmi's marks for a browser wallet (@wagmi/core 2.22.1 connectors/injected.ts): `<connector
 * id>.disconnected`, and `injected.connected` for the browser's default wallet (the one with no target). wagmi writes
 * `true` (:184-190 on Connect, :246-252 on Disconnect) and reads them on load inside a catch that counts any error as
 * "not authorized" (:289-303, :353-355): a mark it could not read kept the wallet from being restored on every load
 * until the next Connect, and any other truthy one counted as set. Removed, a mark reads as never set: the announced
 * wallet is restored, the default one is not (as on a first visit) until Connect.
 */
const isWalletMark = (key: string): boolean => key.endsWith(".disconnected") || key === "wagmi.injected.connected";

/** Whether wagmi can use what is stored under `key`. reconnect uses the last wallet's id as an object key too. */
function isUsable(key: string, text: string): boolean {
  if (key === STATE_KEY) return isWagmiState(text);
  if (key === RECENT_CONNECTOR_KEY) return isText(parse(text));
  if (key === REQUESTED_CHAINS_KEY) return isChainIdList(text);
  if (isWalletMark(key)) return typeof parse(text) === "boolean";
  return true;
}

/**
 * wagmi's keys (its state, the last wallet, its connectors' own) through the app's safe storage. wagmi's default
 * storage reads `window.localStorage` unguarded (@wagmi/core createStorage.js getDefaultStorage), which throws when the
 * browser blocks site data: config creation failed and the page rendered nothing, Connect included. Here blocked
 * storage reads as empty and a write that fails (blocked or full) is dropped, as wagmi's default drops a full store's:
 * the wallet then only forgets the last connection on reload. A write that threw would fail Connect itself, since
 * wagmi stores the last wallet before it counts the wallet connected (@wagmi/core actions/connect.js:22-34). A stored
 * value wagmi cannot use is removed and reads as empty, as the app's own keys are (anything that can write this
 * origin's storage can plant one: another court page or build, an extension, someone at the device).
 */
export function walletStorage(): Storage {
  const storage = createSafeStorage(browserLocalStorage);
  return createStorage({
    storage: {
      getItem: (key) => {
        const text = storage.read(key);
        if (text === null || isUsable(key, text)) return text;
        storage.remove(key);
        return null;
      },
      setItem: (key, value) => {
        storage.write(key, value);
      },
      removeItem: (key) => {
        storage.remove(key);
      },
    },
  });
}
