import { detectRequiredChainId, FALLBACK_CHAIN_ID_STORAGE_KEY } from "./drizzle";
import { detectBackForwardLoad, normalizeEncodedChainPrefix } from "../helpers/chain-url";

//Boots at `url` with `stored` in localStorage (undefined: empty) and reports the chain plus every storage write.
function boot(url, stored) {
  window.history.replaceState(null, "", url);
  if (stored !== undefined) {
    window.localStorage.setItem(FALLBACK_CHAIN_ID_STORAGE_KEY, stored);
  }
  const setItem = jest.spyOn(Storage.prototype, "setItem");
  const chainId = detectRequiredChainId();
  return {
    chainId,
    writes: setItem.mock.calls.map(([key, value]) => [key, String(value)]),
    stored: window.localStorage.getItem(FALLBACK_CHAIN_ID_STORAGE_KEY),
  };
}

const wrote = (chainId) => [[FALLBACK_CHAIN_ID_STORAGE_KEY, String(chainId)]];

afterEach(() => {
  jest.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("detectRequiredChainId", () => {
  it("boots on the path prefix over the legacy param and storage, and stores it", () => {
    expect(boot("/100/cases/1?requiredChainId=1", "1")).toEqual({ chainId: 100, writes: wrote(100), stored: "100" });
  });

  it("boots on a percent-encoded prefix after the load-time normalization, with a plain address bar", () => {
    window.history.replaceState(null, "", "/%31%30%30/cases/1");
    normalizeEncodedChainPrefix();
    expect(window.location.pathname).toBe("/100/cases/1");
    expect(boot(window.location.pathname, "1").chainId).toBe(100);
  });

  describe("on a page loaded by Back or Forward", () => {
    beforeEach(() => {
      window.performance.getEntriesByType = () => [{ type: "back_forward" }];
      detectBackForwardLoad();
    });

    afterEach(() => {
      delete window.performance.getEntriesByType;
      detectBackForwardLoad();
    });

    it("boots on the stored chain, the one the user was on, and writes nothing", () => {
      expect(boot("/100/cases", "1")).toEqual({ chainId: 1, writes: [], stored: "1" });
    });

    it("boots the case page on its URL's chain", () => {
      expect(boot("/100/cases/5", "1")).toEqual({ chainId: 100, writes: wrote(100), stored: "100" });
    });
  });

  it("boots on a percent-encoded prefix, like the router reads it", () => {
    expect(boot("/%31%30%30/cases/1", "1")).toEqual({ chainId: 100, writes: wrote(100), stored: "100" });
  });

  it("writes nothing when storage already holds the prefix's chain", () => {
    expect(boot("/100/cases/1", "100")).toEqual({ chainId: 100, writes: [], stored: "100" });
  });

  it("follows the legacy param on a bare URL, and stores it", () => {
    expect(boot("/cases/1?requiredChainId=100", "1")).toEqual({ chainId: 100, writes: wrote(100), stored: "100" });
  });

  it("ignores an unsupported legacy param and falls back to storage", () => {
    expect(boot("/cases/1?requiredChainId=999", "100")).toEqual({ chainId: 100, writes: wrote(100), stored: "100" });
  });

  //Unchanged store rule: the URL names no chain, so storage never "holds the URL's chain" and is written back.
  it("falls back to storage on a bare URL, writing the same value back", () => {
    expect(boot("/cases/1", "100")).toEqual({ chainId: 100, writes: wrote(100), stored: "100" });
  });

  it.each([
    ["empty", undefined],
    ["junk", "abc"],
    ["an unsupported chain", "999"],
  ])("defaults to mainnet and stores it when storage is %s", (_, stored) => {
    expect(boot("/cases/1", stored)).toEqual({ chainId: 1, writes: wrote(1), stored: "1" });
  });
});
