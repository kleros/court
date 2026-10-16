import {
  CHAIN_ID_ROUTE,
  browserLocation,
  canonicalLocation,
  chainAfterConnect,
  chainPath,
  normalizeEncodedChainPrefix,
  pagePaths,
  reloadOnChain,
  resolveFallbackChainId,
  splitChainPrefix,
  toPath,
  urlChainId,
  withChainPrefix,
} from "./chain-url";
import { matchPath } from "react-router-dom";

//"/cases/5?x=1#h" -> { pathname: "/cases/5", search: "?x=1", hash: "#h" }
function loc(url) {
  const hashIndex = url.indexOf("#");
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const searchIndex = beforeHash.indexOf("?");
  const pathname = searchIndex === -1 ? beforeHash : beforeHash.slice(0, searchIndex);
  const search = searchIndex === -1 ? "" : beforeHash.slice(searchIndex);
  return { pathname, search, hash };
}

const canonicalUrl = (url, chainId) => {
  const out = canonicalLocation(loc(url), chainId);
  return out === null ? null : toPath(out);
};

const isPage = (pathname) =>
  Object.values(pagePaths).some((p) => matchPath(pathname, { path: `${CHAIN_ID_ROUTE}${p}`, exact: true }));

describe("CHAIN_ID_ROUTE", () => {
  it("only matches the supported chain ids", () => {
    expect(CHAIN_ID_ROUTE).toBe("/:chainId(1|100|10200|11155111)");
  });
});

describe("chainPath", () => {
  it.each([
    [1, "/", "/1/"],
    [100, "/cases/5", "/100/cases/5"],
  ])("chainPath(%p, %p) is %p", (chainId, path, expected) => {
    expect(chainPath(chainId, path)).toBe(expected);
  });
});

describe("splitChainPrefix", () => {
  it.each([
    ["/", undefined, "/"],
    ["/courts", undefined, "/courts"],
    ["/1", 1, ""],
    ["/1/", 1, "/"],
    ["/100", 100, ""],
    ["/100/", 100, "/"],
    ["/100/cases/1000", 100, "/cases/1000"],
    ["/11155111/tokens", 11155111, "/tokens"],
    ["/1000", undefined, "/1000"],
    ["/10", undefined, "/10"],
    ["/01", undefined, "/01"],
    ["/999/cases/1", undefined, "/999/cases/1"],
    ["/abc/cases/1", undefined, "/abc/cases/1"],
    ["/100//courts", 100, "//courts"],
  ])("%p -> chain %p, rest %p", (pathname, chainId, rest) => {
    expect(splitChainPrefix(pathname)).toEqual({ chainId, rest });
  });
});

describe("urlChainId", () => {
  it.each([
    ["/100/cases/1?requiredChainId=1", 100],
    ["/cases/1?requiredChainId=100", 100],
    ["/cases/1?requiredChainId=foo", undefined],
    ["/cases/1?requiredChainId=", undefined],
    ["/cases/1?requiredChainId=999", undefined],
    ["/cases/1?requiredChainId=0x64", undefined],
    ["/cases/1?requiredChainId=100abc", 100],
    ["/cases/1?requiredChainId=100&requiredChainId=1", 100],
    ["/cases/1", undefined],
  ])("%p -> %p", (url, expected) => {
    expect(urlChainId(loc(url))).toBe(expected);
  });
});

describe("withChainPrefix", () => {
  it.each([
    ["/", 1, "/1/"],
    ["/cases/1000?x=1#h", 100, "/100/cases/1000?x=1#h"],
    ["/100/cases/1000", 1, "/1/cases/1000"],
    ["/1/cases/5?requiredChainId=1&x=y#h", 100, "/100/cases/5?x=y#h"],
    ["/cases/5?requiredChainId=foo", 1, "/1/cases/5"],
    ["/100", 1, "/1"],
    ["/100/", 1, "/1/"],
    [
      "/#/settings/email-confirmation?address=0xA&token=a%2Bb",
      1,
      "/1/#/settings/email-confirmation?address=0xA&token=a%2Bb",
    ],
    ["/foo", 100, "/100/foo"],
    ["/999/cases/1", 1, "/1/999/cases/1"],
  ])("%p on chain %p -> %p", (url, chainId, expected) => {
    expect(toPath(withChainPrefix(loc(url), chainId))).toBe(expected);
  });

  it("returns a search without the legacy param untouched, byte for byte", () => {
    const search = "?foo=a%20b&bar";
    expect(withChainPrefix({ pathname: "/cases/1", search, hash: "" }, 1).search).toBe(search);
  });
});

const barePages = ["/", "/courts", "/cases", "/cases/1000", "/tokens", "/convert-pnk"];
const prefixes = [1, 100, 10200, 11155111];
const gatedPages = ["/", "/courts", "/cases", "/cases/1000"];

describe("canonicalLocation", () => {
  describe.each([1, 100])("with the wallet on chain %p", (connected) => {
    it.each(barePages)("prefixes the bare page %p with the connected chain", (page) => {
      expect(canonicalUrl(page, connected)).toBe(`/${connected}${page}`);
      expect(canonicalUrl(`${page}?x=1#h`, connected)).toBe(`/${connected}${page}?x=1#h`);
    });

    it.each(gatedPages)("leaves the gated page %p alone under every supported prefix", (page) => {
      prefixes.forEach((chainId) => {
        expect(canonicalUrl(`/${chainId}${page}`, connected)).toBeNull();
      });
    });

    it.each(["/999/cases/1", "/abc/cases/1", "/foo", "/100/foo", "/100//courts", "/100", "/100/", "/1/cases/abc"])(
      "leaves %p alone",
      (url) => {
        expect(canonicalUrl(url, connected)).toBeNull();
      }
    );

    it("follows the legacy param alone, and drops it", () => {
      expect(canonicalUrl("/cases/1?requiredChainId=100", connected)).toBe("/100/cases/1");
      expect(canonicalUrl("/courts?requiredChainId=1&x=1#h", connected)).toBe("/1/courts?x=1#h");
    });

    it("keeps the path when the prefix and the legacy param disagree, and drops the param", () => {
      expect(canonicalUrl("/1/cases/1000?requiredChainId=100", connected)).toBe("/1/cases/1000");
      expect(canonicalUrl("/100/courts?requiredChainId=1", connected)).toBe("/100/courts");
    });

    it.each(["foo", "", "999"])("drops the invalid legacy param %p on pages and uses the connected chain", (value) => {
      expect(canonicalUrl(`/cases/1?requiredChainId=${value}`, connected)).toBe(`/${connected}/cases/1`);
      expect(canonicalUrl(`/100/cases/1?requiredChainId=${value}`, connected)).toBe("/100/cases/1");
    });

    it.each(["foo", "", "999"])("keeps the invalid legacy param %p on a 404", (value) => {
      expect(canonicalUrl(`/foo?requiredChainId=${value}`, connected)).toBeNull();
      expect(canonicalUrl(`/100/foo?requiredChainId=${value}`, connected)).toBeNull();
    });
  });

  it("moves tokens and convert-pnk to the connected chain", () => {
    expect(canonicalUrl("/100/tokens", 1)).toBe("/1/tokens");
    expect(canonicalUrl("/100/convert-pnk", 1)).toBe("/1/convert-pnk");
    expect(canonicalUrl("/tokens?requiredChainId=100", 1)).toBe("/1/tokens");
    expect(canonicalUrl("/1/tokens?x=1#h", 100)).toBe("/100/tokens?x=1#h");
    expect(canonicalUrl("/1/tokens", 1)).toBeNull();
  });

  it("keeps a mismatched prefix on gated pages", () => {
    expect(canonicalUrl("/100/courts", 1)).toBeNull();
    expect(canonicalUrl("/1/cases/5", 100)).toBeNull();
  });

  it("writes nothing while the chain is unknown", () => {
    expect(canonicalUrl("/cases/5", undefined)).toBeNull();
    expect(canonicalUrl("/100/tokens", undefined)).toBeNull();
  });

  describe("on Back or Forward inside the app", () => {
    const movedUrl = (url, chainId) => {
      const out = canonicalLocation(loc(url), chainId, true);
      return out === null ? null : toPath(out);
    };

    it.each(["/", "/courts", "/cases", "/tokens", "/convert-pnk"])(
      "moves %p to the connected chain, keeping the rest of the URL",
      (pagePath) => {
        expect(movedUrl(`/100${pagePath}?x=1#h`, 1)).toBe(`/1${pagePath}?x=1#h`);
        expect(movedUrl(`/1${pagePath}`, 100)).toBe(`/100${pagePath}`);
      }
    );

    it("keeps the case page's chain: the same ID is another dispute there", () => {
      expect(movedUrl("/100/cases/5", 1)).toBeNull();
      expect(movedUrl("/1/cases/5?x=1", 100)).toBeNull();
    });

    it("leaves the connected chain's pages, a 404 and an unknown chain alone", () => {
      expect(movedUrl("/1/courts", 1)).toBeNull();
      expect(movedUrl("/100/foo", 1)).toBeNull();
      expect(movedUrl("/999/courts", 1)).toBeNull();
      expect(movedUrl("/100/courts", undefined)).toBeNull();
    });
  });

  it("canonicalizes the bare email confirmation link with its hash intact", () => {
    expect(canonicalUrl("/#/settings/email-confirmation?address=0xA&token=a%2Bb", 1)).toBe(
      "/1/#/settings/email-confirmation?address=0xA&token=a%2Bb"
    );
  });

  describe("properties, over every row and connected chain", () => {
    const rows = [
      ...barePages.flatMap((p) => [p, `${p}?x=1#h`, `${p}?requiredChainId=100`, `${p}?requiredChainId=foo`]),
      ...prefixes.flatMap((c) => barePages.map((p) => `/${c}${p}`)),
      "/1/cases/1000?requiredChainId=100",
      "/999/cases/1",
      "/abc/cases/1",
      "/foo",
      "/100/foo",
      "/100//courts",
      "/100",
      "/100/",
      "/1/cases/abc",
      "/cases/abc",
      "/courts/",
      "/Cases",
    ];

    it.each(rows)("%p: idempotent and only ever points at a page", (url) => {
      [1, 100, 10200, 11155111].forEach((connected) => {
        const out = canonicalLocation(loc(url), connected);
        expect(canonicalLocation(out ?? loc(url), connected)).toBeNull();
        expect(out === null || isPage(out.pathname)).toBe(true);
      });
    });

    //The redirect's own replace is not a history move, so its result must already be canonical either way.
    it.each(rows)("%p: a history move is idempotent too, and differs only where the page follows the chain", (url) => {
      [1, 100, 10200, 11155111].forEach((connected) => {
        const moved = canonicalLocation(loc(url), connected, true);
        const shown = moved ?? loc(url);
        expect(canonicalLocation(shown, connected, true)).toBeNull();
        expect(canonicalLocation(shown, connected)).toBeNull();
        expect(moved === null || isPage(moved.pathname)).toBe(true);
        const opened = canonicalLocation(loc(url), connected);
        if (toPath(moved ?? loc(url)) !== toPath(opened ?? loc(url))) {
          expect(splitChainPrefix(moved.pathname).chainId).toBe(connected);
          expect(matchPath(moved.pathname, { path: `${CHAIN_ID_ROUTE}${pagePaths.case}`, exact: true })).toBeNull();
        }
      });
    });
  });

  describe("differential: a bare path is a page once prefixed exactly when it is a bare page", () => {
    it.each([
      "/",
      "/courts",
      "/courts/",
      "/Cases",
      "/cases/5",
      "/cases/5/",
      "/cases/abc",
      "/cases/",
      "//cases",
      "/tokens/x",
      "/foo",
    ])("%p", (pathname) => {
      const bareIsPage = Object.values(pagePaths).some((p) => matchPath(pathname, { path: p, exact: true }) !== null);
      expect(canonicalLocation(loc(pathname), 1) !== null).toBe(bareIsPage);
    });
  });
});

//The boot-time detection on master a2856fe, frozen here so the new rule can be compared against it.
function masterResolve(search, stored) {
  const fromStorage = Number.parseInt(stored, 10);
  const fromQueryString = Number.parseInt(new URLSearchParams(search).get("requiredChainId"), 10);
  const chainId = !Number.isNaN(fromQueryString) ? fromQueryString : !Number.isNaN(fromStorage) ? fromStorage : 1;
  return { chainId, shouldStore: Number.isNaN(fromStorage) || fromStorage !== fromQueryString };
}

describe("resolveFallbackChainId", () => {
  const storageValues = [null, "1", "100", "junk", "999"];
  const paramValues = [undefined, "100", "1", "foo", "", "999", "100abc"];
  const searchFor = (param) => (param === undefined ? "" : `?requiredChainId=${param}`);

  describe("matches master on bare paths", () => {
    storageValues
      .filter((stored) => stored !== "999")
      .forEach((stored) => {
        paramValues
          .filter((param) => param !== "999")
          .forEach((param) => {
            it(`storage ${JSON.stringify(stored)}, param ${JSON.stringify(param)}`, () => {
              const search = searchFor(param);
              expect(resolveFallbackChainId({ pathname: "/cases/1", search }, stored)).toEqual(
                masterResolve(search, stored)
              );
            });
          });
      });
  });

  describe("ignores an unsupported stored chain, as if storage were empty, where master booted on it", () => {
    it("master booted on it", () => {
      expect(masterResolve("", "999").chainId).toBe(999);
    });

    it.each(paramValues)("param %p", (param) => {
      const search = searchFor(param);
      //The 999 param is ignored as well, so master's reference reading has no param in that row.
      const masterSearch = param === "999" ? "" : search;
      expect(resolveFallbackChainId({ pathname: "/cases/1", search }, "999")).toEqual(
        masterResolve(masterSearch, null)
      );
    });
  });

  describe("ignores an unsupported numeric param, where master booted on it", () => {
    it.each(storageValues.filter((stored) => stored !== "999"))("storage %p", (stored) => {
      const search = "?requiredChainId=999";
      expect(masterResolve(search, stored).chainId).toBe(999);
      expect(resolveFallbackChainId({ pathname: "/cases/1", search }, stored)).toEqual(masterResolve("", stored));
    });
  });

  it.each([
    ["/100/cases/1", "1", { chainId: 100, shouldStore: true }],
    ["/100/cases/1", "100", { chainId: 100, shouldStore: false }],
    ["/1/cases/1?requiredChainId=100", "100", { chainId: 1, shouldStore: true }],
    ["/999/cases/1", "100", { chainId: 100, shouldStore: true }],
    ["/cases/1", null, { chainId: 1, shouldStore: true }],
  ])("%p with storage %p -> %p", (url, stored, expected) => {
    expect(resolveFallbackChainId(loc(url), stored)).toEqual(expected);
  });

  it("boots every gated page on the chain its canonical URL names", () => {
    const urls = [
      ...gatedPages,
      ...gatedPages.map((p) => `${p}?requiredChainId=100`),
      ...gatedPages.map((p) => `${p}?requiredChainId=foo`),
      ...prefixes.flatMap((c) => gatedPages.map((p) => `/${c}${p}`)),
      "/1/cases/1000?requiredChainId=100",
    ];
    //Both sides receive the same pathname string, so this covers every URL whose first segment decodeURI leaves unchanged.
    urls.forEach((url) => {
      storageValues.forEach((stored) => {
        const boot = resolveFallbackChainId(loc(url), stored).chainId;
        const shown = canonicalLocation(loc(url), boot) ?? loc(url);
        expect(splitChainPrefix(shown.pathname).chainId).toBe(boot);
      });
    });
  });

  it("boots on a percent-encoded prefix read through browserLocation, like the router", () => {
    window.history.replaceState(null, "", "/%31%30%30/courts");
    expect(resolveFallbackChainId(browserLocation(), "1").chainId).toBe(100);
    window.history.replaceState(null, "", "/");
  });
});

describe("browserLocation", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("decodes the path like the router, keeping the query and hash", () => {
    window.history.replaceState(null, "", "/%31%30%30/cases/a%20b?x=%20#h");
    expect(browserLocation()).toEqual({ pathname: "/100/cases/a b", search: "?x=%20", hash: "#h" });
  });

  it("keeps a path that cannot be decoded, without throwing", () => {
    window.history.replaceState(null, "", "/100%/courts");
    expect(browserLocation().pathname).toBe("/100%/courts");
  });
});

describe("normalizeEncodedChainPrefix", () => {
  let replaceStateSpy;

  beforeEach(() => {
    replaceStateSpy = jest.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
    window.history.replaceState(null, "", "/");
  });

  const normalize = (url) => {
    window.history.replaceState(null, "", url);
    replaceStateSpy.mockClear();
    const historyLength = window.history.length;
    normalizeEncodedChainPrefix();
    expect(window.history.length).toBe(historyLength);
    return toPath(window.location);
  };

  it.each([
    ["/%31%30%30/cases/1004?x=%20#h", "/100/cases/1004?x=%20#h"],
    ["/%31%30%30", "/100"],
    ["/1%30%30/courts", "/100/courts"],
    ["/%31/", "/1/"],
    //Only the prefix is decoded: the rest stays as it was, so nothing is decoded twice.
    ["/%31%30%30/cases/a%2520b", "/100/cases/a%2520b"],
  ])("rewrites %p to %p", (url, expected) => {
    expect(normalize(url)).toBe(expected);
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    "/100/courts",
    "/cases/1000",
    "/%2531%30%30/courts",
    "/%39%39%39/cases/1",
    "/%E0%A4%A/courts",
    "/cases/%31%30%30",
  ])("leaves %p alone", (url) => {
    expect(normalize(url)).toBe(url);
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});

describe("chainAfterConnect", () => {
  it.each([
    //Switch declined or unsupported: the page follows the wallet, as a URL without a chain did.
    ["/100/", 1, 1],
    ["/100", 1, 1],
    ["/100/courts", 1, 1],
    ["/100/cases", 1, 1],
    ["/100/tokens", 1, 1],
    ["/100/convert-pnk", 1, 1],
    ["/1/", 100, 100],
    //Switch accepted: the URL already names the wallet's chain, so the reload changes nothing.
    ["/100/courts", 100, 100],
    //The case page keeps its chain: the same ID is another dispute on the wallet's chain.
    ["/100/cases/5", 1, undefined],
    ["/1/cases/5", 100, undefined],
    //Not a page, or a wallet chain the app does not support: reload in place.
    ["/foo", 1, undefined],
    ["/100/foo", 1, undefined],
    ["/100/courts", 137, undefined],
    ["/100/courts", undefined, undefined],
  ])("%s with the wallet on %p reloads onto %p", (pathname, walletChainId, expected) => {
    expect(chainAfterConnect({ pathname }, walletChainId)).toBe(expected);
  });
});

describe("reloadOnChain", () => {
  let seen;
  let reloadSpy;
  let replaceStateSpy;

  beforeEach(() => {
    seen = [];
    reloadSpy = jest.spyOn(window.location, "reload").mockImplementation(() => seen.push(toPath(window.location)));
  });

  afterEach(() => {
    reloadSpy.mockRestore();
    if (replaceStateSpy) {
      replaceStateSpy.mockRestore();
      replaceStateSpy = undefined;
    }
    window.history.replaceState(null, "", "/");
  });

  it("points the URL at the new chain before reloading, without a new history entry", () => {
    window.history.replaceState(null, "", "/cases/5?requiredChainId=1&x=1#h");
    const length = window.history.length;

    reloadOnChain(100);

    expect(seen).toEqual(["/100/cases/5?x=1#h"]);
    expect(window.history.length).toBe(length);
  });

  it("only reloads when the URL already names the chain", () => {
    window.history.replaceState(null, "", "/100/cases/5");
    replaceStateSpy = jest.spyOn(window.history, "replaceState");

    reloadOnChain(100);

    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(seen).toEqual(["/100/cases/5"]);
  });

  it("prefixes an unknown path too, so the reload lands on the new chain", () => {
    window.history.replaceState(null, "", "/foo");

    reloadOnChain(100);

    expect(seen).toEqual(["/100/foo"]);
  });
});
