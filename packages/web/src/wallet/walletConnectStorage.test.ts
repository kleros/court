import { beforeAll, expect, it, vi } from "vitest";

/*
 * WalletConnect's storage in the browser build the app bundles (@walletconnect/keyvaluestorage 1.1.1 dist/index.es.js,
 * patched in .yarn/patches): a browser that blocks site data must not keep the app from offering Connect. Unpatched,
 * reading localStorage at module load threw, so AppKit never loaded; and a refused IndexedDB left every later read
 * waiting forever. jsdom has no IndexedDB, as such a browser; in the app, Vite picks this build (its `browser` field),
 * while tests importing the package by name get the Node build, which uses neither.
 */
const BROWSER_BUILD = "@walletconnect/keyvaluestorage/dist/index.es.js";

/** The part of the build's export used here (the package's own types describe the build its name resolves to). */
interface BrowserBuild {
  KeyValueStorage: new () => {
    setItem(key: string, value: unknown): Promise<void>;
    getItem(key: string): Promise<unknown>;
  };
}

beforeAll(() => {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    vi.spyOn(globalThis, name, "get").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
  }
});

it("works in memory when the browser refuses site data", async () => {
  expect(globalThis.indexedDB).toBeUndefined();
  const { KeyValueStorage } = await vi.importActual<BrowserBuild>(BROWSER_BUILD);
  const storage = new KeyValueStorage();
  await storage.setItem("wc@2:core:0.3:keychain", { topic: "key" });
  expect(await storage.getItem("wc@2:core:0.3:keychain")).toEqual({ topic: "key" });
  expect(await storage.getItem("wc@2:core:0.3:messages")).toBeUndefined();
});
