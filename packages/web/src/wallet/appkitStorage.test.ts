import { beforeEach, describe, expect, it } from "vitest";
import type { CaipNetwork } from "@reown/appkit";
import { StorageUtil, type WcWallet } from "@reown/appkit-controllers";
import { mainnet } from "@reown/appkit/networks";
import { createSafeStorage } from "@court/core";
import { browserLocalStorage } from "../storage";
import { dropUnusableAppKitValues } from "./appkitStorage";

const ADDRESS = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
/** Ethereum as AppKit's adapter hands it over with a connection. */
const MAINNET: CaipNetwork = { ...mainnet, chainNamespace: "eip155", caipNetworkId: "eip155:1" };

/** A wallet as Reown's wallet list describes it (AppKit's own type); AppKit stores the last ones used. */
const WALLET: WcWallet = {
  id: "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
  name: "MetaMask",
  homepage: "metamask.io",
  image_id: "018b2d52-10e9-4158-1fde-a5d5bac5aa00",
  order: 10,
  mobile_link: "metamask://",
  desktop_link: null,
  webapp_link: null,
  app_store: null,
  play_store: null,
  rdns: "io.metamask",
  chrome_store: null,
  injected: [{ namespace: "eip155", injected_id: "isMetaMask" }],
  chains: ["eip155:1", "eip155:100"],
  supports_wc: true,
};

/**
 * Every value AppKit stores as JSON, written by AppKit itself (@reown/appkit-controllers 1.8.24 StorageUtil, each
 * writer with the arguments its callers pass), plus the active network, as after a session that connected a browser
 * wallet and a WalletConnect wallet and loaded names, balances, prices and transactions.
 */
function writeAsAppKitDoes(): void {
  StorageUtil.setActiveCaipNetworkId("eip155:100");
  StorageUtil.setConnections(
    [{ connectorId: "io.test.mockwallet", accounts: [{ address: ADDRESS }], caipNetwork: MAINNET }],
    "eip155",
  );
  StorageUtil.setConnections([{ connectorId: "walletConnect", accounts: [{ address: OTHER }] }], "eip155");
  // Browsers stored {"eip155":[""]} at the first load (an empty connector id), then the wallet disconnected.
  StorageUtil.addDisconnectedConnectorId("", "eip155");
  StorageUtil.addDisconnectedConnectorId("io.test.mockwallet", "eip155");
  StorageUtil.setAppKitRecent(WALLET);
  StorageUtil.setWalletConnectDeepLink({ name: WALLET.name, href: "metamask://" });
  StorageUtil.setPreferredAccountTypes({ eip155: "eoa" });
  StorageUtil.updateLatestAppKitVersion({ timestamp: Date.now(), version: "1.8.25" });
  const caipAddress = `eip155:1:${ADDRESS}`;
  StorageUtil.updateBalanceCache({ caipAddress, balance: { balances: [] }, timestamp: Date.now() });
  StorageUtil.updateNativeBalanceCache({ caipAddress, balance: "1.5", symbol: "ETH", timestamp: Date.now() });
  StorageUtil.updateEnsCache({ address: ADDRESS, ens: [], timestamp: Date.now() });
  StorageUtil.updateIdentityCache({ address: ADDRESS, identity: { name: null, avatar: null }, timestamp: Date.now() });
  StorageUtil.updateTransactionsCache({
    address: ADDRESS,
    chainId: "eip155:1",
    timestamp: Date.now(),
    transactions: { data: [], next: null },
  });
  StorageUtil.updateTokenPriceCache({ addresses: [ADDRESS], timestamp: Date.now(), tokenPrice: { fungibles: [] } });
  StorageUtil.updateTonWalletsCache([]);
  // AppKit's removals write the cache again without that entry.
  StorageUtil.removeEnsFromCache(OTHER);
  StorageUtil.removeAddressFromNativeBalanceCache(`eip155:1:${OTHER}`);
  StorageUtil.removeTransactionsCache({ address: ADDRESS, chainId: "eip155:100" });
}

const storedValues = () => Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]));

const drop = () => {
  dropUnusableAppKitValues(createSafeStorage(browserLocalStorage));
};

beforeEach(() => {
  localStorage.clear();
});

describe("AppKit's stored values", () => {
  it("keeps every value AppKit itself writes", () => {
    writeAsAppKitDoes();
    const written = storedValues();
    expect(Object.keys(written).sort()).toEqual([
      "@appkit/active_caip_network_id",
      "@appkit/active_namespace",
      "@appkit/connections",
      "@appkit/disconnected_connector_ids",
      "@appkit/ens_cache",
      "@appkit/history_transactions_cache",
      "@appkit/identity_cache",
      "@appkit/latest_version",
      "@appkit/native_balance_cache",
      "@appkit/portfolio_cache",
      "@appkit/preferred_account_types",
      "@appkit/recent_wallet",
      "@appkit/recent_wallets",
      "@appkit/token_price_cache",
      "@appkit/ton_wallets_cache",
      "WALLETCONNECT_DEEPLINK_CHOICE",
    ]);
    drop();
    expect(storedValues()).toEqual(written);
  });

  it("checks every value AppKit stores as JSON: a number in each is removed", () => {
    writeAsAppKitDoes();
    for (const key of Object.keys(localStorage)) localStorage.setItem(key, "5");
    drop();
    // AppKit reads this one as text, not JSON.
    expect(Object.keys(localStorage)).toEqual(["@appkit/active_namespace"]);
  });

  it("keeps a stored network the court runs on", () => {
    for (const network of ["eip155:1", "eip155:100", "eip155:11155111", "eip155:10200"]) {
      localStorage.setItem("@appkit/active_caip_network_id", network);
      drop();
      expect(localStorage.getItem("@appkit/active_caip_network_id")).toBe(network);
    }
  });

  // A network the court does not run made AppKit open its "Switch Network" window at every load, wallet or not.
  it.each(["eip155:137", "eip155:999", "eip155:[object Object]", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", ""])(
    "removes a stored network the court does not run: %j",
    (network) => {
      localStorage.setItem("@appkit/active_caip_network_id", network);
      drop();
      expect(localStorage.getItem("@appkit/active_caip_network_id")).toBeNull();
      expect(StorageUtil.getActiveCaipNetworkId()).toBeUndefined();
    },
  );

  // Valid JSON of another shape than AppKit writes, which AppKit parsed and used unchecked. Each is removed and AppKit
  // then reads its empty default: `null` connections made AppKit's start fail, so Connect failed on every load; a
  // recent-wallet list that was not a list of wallets threw at every Connect click.
  const connection = (fields: Record<string, unknown>) =>
    JSON.stringify({ eip155: [{ connectorId: "x", accounts: [{ address: ADDRESS }], ...fields }] });
  // A recent wallet with one field of AppKit's wallet type (WcWallet) of another type. AppKit turns these fields into
  // text or numbers when it lists the wallet; one that cannot be converted (an object whose toString is null) threw
  // there, and the Connect window listed no wallet at all, on every load.
  const NO_TEXT = { toString: null };
  const wallet = (fields: Record<string, unknown>) => JSON.stringify({ id: "x", name: "Planted", ...fields });
  const WRONG_WALLET_FIELDS: readonly Record<string, unknown>[] = [
    { image_id: NO_TEXT },
    { image_url: NO_TEXT },
    { rdns: NO_TEXT },
    { order: NO_TEXT },
    { order: "1" },
    { display_index: NO_TEXT },
    { homepage: NO_TEXT },
    { description: 5 },
    { badge_type: [] },
    { link_mode: NO_TEXT },
    { mobile_link: NO_TEXT },
    { desktop_link: 5 },
    { webapp_link: NO_TEXT },
    { app_store: NO_TEXT },
    { play_store: NO_TEXT },
    { chrome_store: NO_TEXT },
    { injected: NO_TEXT },
    { injected: [5] },
    { injected: [{ namespace: "eip155", injected_id: NO_TEXT }] },
    { supports_wc: "true" },
    { supports_wcpay: NO_TEXT },
    { chains: null },
  ];
  const CACHE_SHAPES = ["null", "5", "[]", '{"a":null}', '{"a":5}', '{"a":{"timestamp":"1"}}', '{"a":{}}'];
  type Case = readonly [key: string, value: string, read: () => unknown, empty: unknown];
  const cases = (key: string, read: () => unknown, empty: unknown, values: readonly string[]): Case[] =>
    values.map((value) => [key, value, read, empty] as const);
  it.each([
    ...cases("@appkit/connections", () => StorageUtil.getConnections(), {}, [
      "null",
      "5",
      "[]",
      '{"eip155":5}',
      '{"eip155":[5]}',
      '{"eip155":[null]}',
      "{oops",
      connection({ connectorId: 5 }),
      connection({ accounts: 5 }),
      connection({ accounts: [null] }),
      connection({ accounts: [{ address: 5 }] }),
      connection({ caipNetwork: 5 }),
    ]),
    ...cases("@appkit/disconnected_connector_ids", () => StorageUtil.getDisconnectedConnectorIds(), {}, [
      "null",
      "5",
      "[]",
      '{"eip155":5}',
      '{"eip155":"x"}',
      '{"eip155":[5]}',
      '{"eip155":[null]}',
    ]),
    ...cases(
      "@appkit/recent_wallets",
      () => StorageUtil.getRecentWallets(),
      [],
      [
        "null",
        "5",
        "{}",
        "[null]",
        "[5,{}]",
        '[{"id":5,"name":"x"}]',
        '[{"id":"x"}]',
        '[{"id":"x","name":"y","chains":5}]',
        '[{"id":"x","name":"y","chains":[5]}]',
        ...WRONG_WALLET_FIELDS.map((fields) => `[${wallet(fields)}]`),
      ],
    ),
    ...cases("@appkit/recent_wallet", () => StorageUtil.getRecentWallet(), null, [
      "null",
      "5",
      "[]",
      '{"id":"x"}',
      '{"id":5,"name":"x"}',
      ...WRONG_WALLET_FIELDS.map(wallet),
    ]),
    ...cases("@appkit/preferred_account_types", () => StorageUtil.getPreferredAccountTypes(), {}, [
      "null",
      "5",
      "[]",
      '{"eip155":5}',
    ]),
    ...cases("@appkit/latest_version", () => StorageUtil.getLatestAppKitVersionCache(), {}, [
      "null",
      "5",
      '{"version":"1.9.0"}',
      '{"timestamp":1,"version":5}',
    ]),
    ...cases("@appkit/portfolio_cache", () => StorageUtil.getBalanceCache(), {}, CACHE_SHAPES),
    ...cases("@appkit/native_balance_cache", () => StorageUtil.getNativeBalanceCache(), {}, CACHE_SHAPES),
    ...cases("@appkit/ens_cache", () => StorageUtil.getEnsCache(), {}, CACHE_SHAPES),
    ...cases("@appkit/identity_cache", () => StorageUtil.getIdentityCache(), {}, CACHE_SHAPES),
    ...cases("@appkit/token_price_cache", () => StorageUtil.getTokenPriceCache(), {}, CACHE_SHAPES),
    // An address with no chain left ({"a":{}}) is a form AppKit writes here (removeTransactionsCache).
    ...cases("@appkit/history_transactions_cache", () => StorageUtil.getTransactionsCache(), {}, [
      ...CACHE_SHAPES.filter((value) => value !== '{"a":{}}'),
      '{"0xa":{"eip155:1":null}}',
      '{"0xa":{"eip155:1":{}}}',
    ]),
    ...cases("@appkit/ton_wallets_cache", () => StorageUtil.getTonWalletsCache(), undefined, [
      "null",
      "5",
      "[]",
      '{"timestamp":1}',
      '{"wallets":[]}',
      '{"timestamp":"1","wallets":[]}',
    ]),
    ...cases("WALLETCONNECT_DEEPLINK_CHOICE", () => StorageUtil.getWalletConnectDeepLink(), undefined, [
      "null",
      "5",
      "[]",
      '{"href":5,"name":"x"}',
      '{"href":"x"}',
    ]),
  ])("removes %s = %s, and AppKit reads it as empty", (key, value, read, empty) => {
    localStorage.setItem(key, value);
    drop();
    expect(localStorage.getItem(key)).toBeNull();
    expect(read()).toEqual(empty);
  });

  // Reown's wallet list may send null where the type says text, or fields the type does not name (UNVERIFIED either
  // way); neither breaks AppKit, so neither may cost the user the wallets they used last.
  it("keeps recent wallets with null text fields, or with a field AppKit's type does not name", () => {
    const nulls = { ...WALLET, homepage: null, image_id: null, image_url: null, description: null, badge_type: null };
    const recentWallets = JSON.stringify([
      { ...nulls, link_mode: null, display_index: 2, supports_wcpay: false },
      { ...WALLET, id: "other", explorer_id: "abc" },
    ]);
    localStorage.setItem("@appkit/recent_wallets", recentWallets);
    localStorage.setItem("@appkit/recent_wallet", JSON.stringify(nulls));
    drop();
    expect(localStorage.getItem("@appkit/recent_wallets")).toBe(recentWallets);
    expect(localStorage.getItem("@appkit/recent_wallet")).toBe(JSON.stringify(nulls));
  });

  it("leaves other keys alone", () => {
    localStorage.setItem("@kleros/court/theme", "null");
    localStorage.setItem("wagmi.store", "null");
    drop();
    expect(localStorage.getItem("@kleros/court/theme")).toBe("null");
    expect(localStorage.getItem("wagmi.store")).toBe("null");
  });

  it("reads nothing and throws nothing when the browser blocks site data", () => {
    expect(() => {
      dropUnusableAppKitValues(createSafeStorage(() => null));
    }).not.toThrow();
  });
});
