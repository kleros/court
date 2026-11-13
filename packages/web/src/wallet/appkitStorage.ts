import { COURT_CHAIN_ID_LIST, isPlainObject, type SafeStorage } from "@court/core";

/*
 * AppKit reads its stored values itself, not through the app's storage (@reown/appkit-controllers 1.8.24
 * utils/StorageUtil.js; key names from @reown/appkit-common SafeLocalStorage.js), and uses what JSON.parse gives
 * unchecked. Valid JSON of another shape broke it on every load until site data was cleared: `null` connections made
 * its start fail (ConnectionController.js:51-55), so Connect failed; a recent-wallet list that was not a list of wallets
 * threw at every Connect click (WalletUtil.js:13-17). Anything that can write the court origin's storage can plant
 * one: another court page or build, an extension, someone at the device. Literal key names: importing AppKit here would
 * load it in the read-only build too.
 */

type Shape = (value: unknown) => boolean;

const isText = (value: unknown): value is string => typeof value === "string";
const isNumber: Shape = (value) => typeof value === "number";
const isBoolean: Shape = (value) => typeof value === "boolean";
const orNull =
  (shape: Shape): Shape =>
  (value) =>
    value === null || shape(value);
const listOf =
  (item: Shape): Shape =>
  (value) =>
    Array.isArray(value) && value.every(item);
const recordOf =
  (entry: Shape): Shape =>
  (value) =>
    isPlainObject(value) && Object.values(value).every(entry);

/** A cache entry; AppKit drops it once its timestamp is too old. Every cache writer stores Date.now(). */
const isTimestamped = (value: unknown): value is Record<string, unknown> =>
  isPlainObject(value) && typeof value.timestamp === "number";

/**
 * The optional fields of a wallet from Reown's wallet list, each with its type in AppKit's WcWallet (appkit-controllers
 * types/src/utils/TypeUtil.d.ts:98-123). AppKit turns them into text or numbers when it lists the wallet (AssetUtil.js:
 * 79-84, scaffold-ui w3m-connector-list/index.js:150-173); one it could not convert, such as an object whose toString
 * is null, threw there and the Connect window listed no wallet. Text may also be null, which converts. Fields the type
 * does not name are left alone: AppKit's code is typed against WcWallet, so it reads none of them.
 */
const WALLET_FIELDS: Readonly<Record<string, Shape>> = {
  badge_type: orNull(isText),
  description: orNull(isText),
  chains: listOf(isText),
  homepage: orNull(isText),
  image_id: orNull(isText),
  image_url: orNull(isText),
  order: isNumber,
  link_mode: orNull(isText),
  mobile_link: orNull(isText),
  desktop_link: orNull(isText),
  webapp_link: orNull(isText),
  app_store: orNull(isText),
  play_store: orNull(isText),
  chrome_store: orNull(isText),
  rdns: orNull(isText),
  injected: orNull(listOf(recordOf(isText))),
  display_index: isNumber,
  supports_wc: isBoolean,
  supports_wcpay: isBoolean,
};

/** A wallet from Reown's wallet list (WcWallet): an id and a name, and every other field it names absent or of its type. */
const isWallet: Shape = (value) =>
  isPlainObject(value) &&
  isText(value.id) &&
  isText(value.name) &&
  Object.entries(WALLET_FIELDS).every(([key, isShape]) => value[key] === undefined || isShape(value[key]));

/** A stored connection (Connection in appkit-common): its connector id, the accounts' addresses, maybe its network. */
const isConnection: Shape = (value) =>
  isPlainObject(value) &&
  isText(value.connectorId) &&
  listOf((account) => isPlainObject(account) && isText(account.address))(value.accounts) &&
  (value.caipNetwork === undefined || isPlainObject(value.caipNetwork));

/** Every value StorageUtil reads with JSON.parse, and the shape its writers store (line numbers in StorageUtil.js). */
const JSON_VALUES: Readonly<Record<string, Shape>> = {
  // setConnections / getConnections :564-606, per namespace
  "@appkit/connections": recordOf(listOf(isConnection)),
  // addDisconnectedConnectorId / getDisconnectedConnectorIds :634-674, per namespace
  "@appkit/disconnected_connector_ids": recordOf(listOf(isText)),
  // setAppKitRecent / getRecentWallets, getRecentWallet :108-144
  "@appkit/recent_wallets": listOf(isWallet),
  "@appkit/recent_wallet": isWallet,
  // setWalletConnectDeepLink / getWalletConnectDeepLink :37-55
  WALLETCONNECT_DEEPLINK_CHOICE: (value) => isPlainObject(value) && isText(value.href) && isText(value.name),
  // setPreferredAccountTypes / getPreferredAccountTypes :543-563, per namespace
  "@appkit/preferred_account_types": recordOf(isText),
  // updateLatestAppKitVersion / getLatestAppKitVersionCache :810-830
  "@appkit/latest_version": (value) => isTimestamped(value) && isText(value.version),
  // the caches :311-497 and :686-794, per address (transactions: per address, then per chain)
  "@appkit/portfolio_cache": recordOf(isTimestamped),
  "@appkit/native_balance_cache": recordOf(isTimestamped),
  "@appkit/ens_cache": recordOf(isTimestamped),
  "@appkit/identity_cache": recordOf(isTimestamped),
  "@appkit/token_price_cache": recordOf(isTimestamped),
  "@appkit/history_transactions_cache": recordOf(recordOf(isTimestamped)),
  // updateTonWalletsCache / getTonWalletsCache :498-530
  "@appkit/ton_wallets_cache": (value) => isTimestamped(value) && Array.isArray(value.wallets),
};

const ACTIVE_NETWORK_KEY = "@appkit/active_caip_network_id";
const COURT_NETWORKS: readonly string[] = COURT_CHAIN_ID_LIST.map((id) => `eip155:${String(id)}`);

function parse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Before AppKit starts: removes every stored AppKit value it could not use, so it reads as empty (as the app's own keys
 * do), and a stored network the court does not run. AppKit keeps the last wallet network after the wallet disconnects
 * or locks; at the next start it took that network as its own and, the court not running it, opened its "Switch
 * Network" window with no wallet connected, a window that cannot be closed (appkit-base-client.js:393-403,
 * appkit-utils CaipNetworkUtil.js:236-246, ChainController.js:267-274). Without it AppKit starts on the first court
 * network; a wallet still connected on another network reports it itself, and AppKit asks to switch as before.
 */
export function dropUnusableAppKitValues(storage: SafeStorage): void {
  for (const [key, isShape] of Object.entries(JSON_VALUES)) {
    const text = storage.read(key);
    if (text !== null && !isShape(parse(text))) storage.remove(key);
  }
  const network = storage.read(ACTIVE_NETWORK_KEY);
  if (network !== null && !COURT_NETWORKS.includes(network)) storage.remove(ACTIVE_NETWORK_KEY);
}
