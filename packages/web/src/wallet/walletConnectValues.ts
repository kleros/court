import { isPlainObject } from "@court/core";

/** The part of WalletConnect's store (@walletconnect/keyvaluestorage 1.1.1 KeyValueStorage) used here. */
export interface WalletConnectStore {
  getItem(key: string): Promise<unknown>;
  removeItem(key: string): Promise<void>;
}

/** Whether a stored value has the form WalletConnect writes it in. */
type IsUsable = (value: unknown) => boolean;

/** A list of records (objects); `isRecord` checks what WalletConnect's start reads in one. */
const listOf =
  (isRecord: (record: Record<string, unknown>) => boolean = () => true): IsUsable =>
  (value) =>
    Array.isArray(value) && value.every((record) => isPlainObject(record) && isRecord(record));

/*
 * The stored lists of records whose wrong shape stops WalletConnect's start when AppKit starts it (D-01, D-55:
 * WalletConnect is one of the wallets), under the keys its stores build: prefix, version, "//", name (@walletconnect/core
 * 2.23.7 Store, JsonRpcHistory and Expirer `storageKey`, plus the session, proposal, request and auth stores of the
 * sign-client 2.23.7 that @walletconnect/universal-provider loads). The start iterates each value unchecked: a value with
 * a length that is not a list (text, or an object with a length) threw, as did a null in the history or expirer list.
 * It also compares each pairing's and session's `expiry` and each proposal's `expiryTimestamp` with the time by
 * multiplying it (@walletconnect/utils 2.23.7 isExpired, misc.ts:412-414; core pairing.ts:312-315, sign-client
 * engine.ts:1858-1869). These are numbers (a session's as the wallet sends it, checked only by that comparison); an
 * object that cannot be turned into one (its own toString not a function) threw. AppKit then had no WalletConnect
 * provider and the Connect window no WalletConnect row, on every load, as nothing rewrote the value. Each expiration's
 * `expiry`, the time a pairing, session, proposal or request expires, is compared the same way at each heartbeat (every
 * 5 s) while the relay connection is open (core expirer.ts:178-199): such an object threw there every time, ending that
 * heartbeat's later checks, and WalletConnect writes the list back as it holds it at each change (:75-85, :144-147), so
 * it never went away.
 */
const RECORD_LISTS: [string, IsUsable][] = [
  ["wc@2:core:0.3//pairing", listOf((pairing) => typeof pairing.expiry === "number")],
  ["wc@2:core:0.3//history", listOf()],
  ["wc@2:core:0.3//expirer", listOf((expiration) => typeof expiration.expiry === "number")],
  ["wc@2:client:0.3//session", listOf((session) => typeof session.expiry === "number")],
  ["wc@2:client:0.3//proposal", listOf((proposal) => typeof proposal.expiryTimestamp === "number")],
  ["wc@2:client:0.3//request", listOf()],
  ["wc@1.5:auth:0.3//authKeys", listOf()],
  ["wc@1.5:auth:0.3//pairingTopics", listOf()],
  ["wc@1.5:auth:0.3//requests", listOf()],
];

/** The relay protocols WalletConnect's relay API knows (@walletconnect/relay-api 1.0.11 RELAY_JSONRPC). */
const RELAY_PROTOCOLS: readonly unknown[] = ["irn", "iridium", "waku"];

/**
 * The relay subscriptions of WalletConnect's core (@walletconnect/core 2.23.7 Subscriber `storageKey`), a list of
 * `{topic, relay: {protocol}, id}` as it writes them (subscriber.ts:109-110, :399, stored by :419-424). Once its
 * connection to the relay opens it subscribes to the stored topics again (relayer.ts:419; subscriber.ts:478-487,
 * :317-322), reading the first record's protocol and every topic unchecked, and asks the relay API for that protocol,
 * which throws on one it does not know (@walletconnect/utils 2.23.7 relay.ts:12-16). Another shape threw there, an
 * error nothing caught, until WalletConnect's next subscription rewrote the list.
 */
const SUBSCRIPTIONS = "wc@2:core:0.3//subscription";

const isSubscription = (subscription: Record<string, unknown>): boolean =>
  typeof subscription.topic === "string" &&
  typeof subscription.id === "string" &&
  isPlainObject(subscription.relay) &&
  RELAY_PROTOCOLS.includes(subscription.relay.protocol);

/*
 * WalletConnect's keychain (@walletconnect/core 2.23.7 KeyChain `storageKey`): its keys by name, read at start
 * (keychain.ts:27-35, :78-81; a stored null threw there). Under `client_ed25519_seed` it keeps its client's key for
 * the relay, made when missing as 64 lowercase hex characters (crypto.ts:191-200). Any other value there threw at
 * each signature for the relay (relayer.ts:485-489) and each pairing (subscriber.ts:600-609), so WalletConnect could
 * not pair on Connect, on every load: nothing replaced it. Removed, WalletConnect makes a new key. The keys of stored
 * sessions go with it, so WalletConnect drops those sessions at start (sign-client 2.23.7 engine.ts:1858-1866): the
 * user pairs again.
 */
const KEYCHAIN = "wc@2:core:0.3//keychain";

const isKeychain = (value: unknown): boolean =>
  isPlainObject(value) &&
  (value.client_ed25519_seed === undefined ||
    (typeof value.client_ed25519_seed === "string" && /^[0-9a-f]{64}$/.test(value.client_ed25519_seed)));

/** Each stored value checked here, with whether it has the form WalletConnect writes it in. */
const STORED_VALUES: [string, IsUsable][] = [
  ...RECORD_LISTS,
  [SUBSCRIPTIONS, listOf(isSubscription)],
  [KEYCHAIN, isKeychain],
];

/** How long boot waits for WalletConnect's store, which answers in milliseconds, before AppKit starts anyway. */
export const WALLET_CONNECT_CHECK_MS = 2_000;

/**
 * Before AppKit starts: removes every stored value above that is not of the form WalletConnect writes, so it reads as
 * none, as before a first pairing. Anything that can write the court origin's storage can plant one: another court page
 * or build, an extension, someone at the device; WalletConnect's store also takes such values over from localStorage
 * the first time it opens, which reading through it here does too. Never rejects and waits at most
 * WALLET_CONNECT_CHECK_MS: the page renders after this, and neither it nor the browser wallets may wait on
 * WalletConnect's store. A store that fails or does not answer here fails WalletConnect's own start the same way, which
 * costs its row only. Resolves whether the store answered in that time (a failure is an answer).
 */
export async function dropUnusableWalletConnectValues(store: WalletConnectStore): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<false>((resolve) => {
    timer = setTimeout(resolve, WALLET_CONNECT_CHECK_MS, false);
  });
  const check = Promise.all(
    STORED_VALUES.map(async ([key, isUsable]) => {
      const value = await store.getItem(key);
      if (value !== undefined && !isUsable(value)) await store.removeItem(key);
    }),
  ).then(
    () => true,
    () => true,
  );
  try {
    return await Promise.race([check, late]);
  } finally {
    clearTimeout(timer);
  }
}
