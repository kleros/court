import { expect, it, vi } from "vitest";
import { createSafeStorage } from "@court/core";
import { browserLocalStorage } from "../storage";
import { forgetWalletConnect } from "./walletConnectRecovery";

/*
 * WalletConnect's store on IndexedDB, in the browser build the app bundles (@walletconnect/keyvaluestorage 1.1.1
 * dist/index.es.js, patched in .yarn/patches). jsdom has no IndexedDB: idb-keyval, through which that build reads and
 * writes it, keeps the database's keys and values in a map here, as IndexedDB returns them.
 */
const BROWSER_BUILD = "@walletconnect/keyvaluestorage/dist/index.es.js";

/** The part of the build's export used here (the package's own types describe the build its name resolves to). */
interface BrowserBuild {
  KeyValueStorage: new () => { getKeys(): Promise<string[]>; removeItem(key: string): Promise<void> };
}

const database = vi.hoisted(() => new Map<unknown, unknown>());

vi.mock("idb-keyval", () => ({
  createStore: () => "WalletConnect's store",
  get: (key: unknown) => Promise.resolve(database.get(key)),
  set: (key: unknown, value: unknown) => Promise.resolve(void database.set(key, value)),
  del: (key: unknown) => Promise.resolve(void database.delete(key)),
  keys: () => Promise.resolve([...database.keys()]),
}));

// IndexedDB keys can also be numbers, dates or lists; WalletConnect writes text keys only, so only something else that
// can write the court origin's storage (an extension, someone at the device) leaves one in its database.
it.each([
  ["text, not WalletConnect's", "other"],
  ["a number", 1],
  ["a list", ["wc@2:client:0.3:session"]],
])(
  "forgets WalletConnect's saved data, and only it, when its database also holds a key that is %s",
  async (_n, key) => {
    database.clear();
    database
      .set("wc_storage_version", 1)
      .set("wc@2:client:0.3:session", "[]")
      .set("wc@2:core:0.3:keychain", "{}")
      .set(key, "{}");
    const { KeyValueStorage } = await vi.importActual<BrowserBuild>(BROWSER_BUILD);

    await forgetWalletConnect(new KeyValueStorage(), createSafeStorage(browserLocalStorage));

    expect([...database.keys()]).toEqual(["wc_storage_version", key]);
  },
);

// The store lists a text key with a `.` or `..` segment but refuses to remove it, as it refuses to write or read one
// (unstorage 1.17.6 index.mjs:53-58): WalletConnect never wrote it, and cannot read it either.
it.each(["wc@2:poison:..", "wc@junk:..:x"])(
  "forgets the rest of WalletConnect's saved data when its database also holds the key %s, which stays",
  async (key) => {
    database.clear();
    database
      .set("wc_storage_version", 1)
      .set("wc@2:client:0.3:session", "[]")
      .set(key, "{}")
      .set("wc@2:core:0.3:keychain", "{}");
    const { KeyValueStorage } = await vi.importActual<BrowserBuild>(BROWSER_BUILD);

    await forgetWalletConnect(new KeyValueStorage(), createSafeStorage(browserLocalStorage));

    expect([...database.keys()]).toEqual(["wc_storage_version", key]);
  },
);
