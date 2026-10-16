import React from "react";
import { act } from "react-dom/test-utils";
import { Route, Switch, useParams } from "react-router-dom";
import { CanonicalChainUrl, ChainLink, ChainNavLink, useReplaceChainInUrl } from "./chain-navigation";
import { chainRoutePath, pagePaths } from "../helpers/chain-url";
import { createBrowserHistory, createMemoryHistory } from "history";
import { mountInRouter } from "../test-utils/memory-router";
import useChainId from "../hooks/use-chain-id";

jest.mock("../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));

function CaseMarker() {
  return <div id="case">{JSON.stringify(useParams())}</div>;
}

//The app's route tree, with a marker per page instead of the page itself.
function Pages() {
  return (
    <CanonicalChainUrl>
      <Switch>
        {Object.entries(pagePaths).map(([key, pagePath]) => (
          <Route key={key} exact path={chainRoutePath(pagePath)}>
            {key === "case" ? <CaseMarker /> : <div id={key} />}
          </Route>
        ))}
        <Route path="*">
          <div id="c404" />
        </Route>
      </Switch>
    </CanonicalChainUrl>
  );
}

let page;
let allowConsoleError;

function mount(url, chainId, renderTree = () => <Pages />, history = undefined) {
  useChainId.mockReturnValue(chainId);
  page = mountInRouter(renderTree, { url, history });
  return page;
}

//Opens the app on `entries[index]` with the other entries already in the session history, as after a chain switch,
//which reloads the page and keeps the entries visited before it.
const openOn = (entries, index, chainId) =>
  mount(undefined, chainId, undefined, createMemoryHistory({ initialEntries: entries, initialIndex: index }));

const navigate = (fn) =>
  act(() => {
    fn(page.history);
  });

//The browser fires popstate after history.back() or forward() returns.
const traverse = (move) =>
  act(async () => {
    const popped = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
    move();
    await popped;
  });

const shows = (id) => page.container.querySelector(`#${id}`) !== null;

beforeEach(() => {
  allowConsoleError = false;
  jest.spyOn(console, "error");
});

afterEach(() => {
  page?.unmount();
  page = undefined;
  document.body.innerHTML = "";
  const consoleErrors = console.error.mock.calls;
  console.error.mockRestore();
  //React Router reports misuse through console.error. Only the row that crashes on purpose may log.
  if (!allowConsoleError) {
    expect(consoleErrors).toEqual([]);
  }
});

describe("CanonicalChainUrl", () => {
  it.each([
    ["/", "home", "/1/"],
    ["/courts", "courts", "/1/courts"],
    ["/cases", "cases", "/1/cases"],
    ["/cases/1000", "case", "/1/cases/1000"],
    ["/tokens", "tokens", "/1/tokens"],
    ["/convert-pnk", "convertPnk", "/1/convert-pnk"],
  ])("rewrites the bare page %p in one replace, with no new history entry", (url, marker, canonical) => {
    mount(`${url}?x=1#h`, 1);
    expect(shows(marker)).toBe(true);
    expect(page.currentUrl()).toBe(`${canonical}?x=1#h`);
    expect(page.rewrites()).toBe(1);
    expect(page.history.length).toBe(1);
    expect(page.history.index).toBe(0);
  });

  it.each([
    ["/1/", 1, "home"],
    ["/100", 100, "home"],
    ["/100/", 100, "home"],
    ["/1/courts", 1, "courts"],
    ["/100/cases", 100, "cases"],
    ["/10200/cases/5", 10200, "case"],
    ["/11155111/tokens", 11155111, "tokens"],
    ["/1/convert-pnk", 1, "convertPnk"],
  ])("leaves the canonical URL %p alone on chain %p", (url, chainId, marker) => {
    mount(url, chainId);
    expect(shows(marker)).toBe(true);
    expect(page.currentUrl()).toBe(url);
    expect(page.rewrites()).toBe(0);
  });

  it.each(["/foo", "/100/foo", "/999/cases/1", "/abc/cases/1", "/100//courts"])(
    "shows the 404 in place for %p",
    (url) => {
      mount(url, 1);
      expect(shows("c404")).toBe(true);
      expect(page.currentUrl()).toBe(url);
      expect(page.rewrites()).toBe(0);
    }
  );

  it("follows the legacy param on a bare URL, and drops it", () => {
    mount("/cases/1?requiredChainId=100", 1);
    expect(shows("case")).toBe(true);
    expect(page.currentUrl()).toBe("/100/cases/1");
    expect(page.rewrites()).toBe(1);
  });

  it("keeps the path when it disagrees with the legacy param, and drops the param", () => {
    mount("/1/cases/1000?requiredChainId=100", 1);
    expect(shows("case")).toBe(true);
    expect(page.currentUrl()).toBe("/1/cases/1000");
    expect(page.rewrites()).toBe(1);
  });

  it("moves tokens to the connected chain", () => {
    mount("/100/tokens", 1);
    expect(shows("tokens")).toBe(true);
    expect(page.currentUrl()).toBe("/1/tokens");
    expect(page.rewrites()).toBe(1);
  });

  it("keeps a mismatched prefix on a gated page", () => {
    mount("/100/courts", 1);
    expect(shows("courts")).toBe(true);
    expect(page.currentUrl()).toBe("/100/courts");
    expect(page.rewrites()).toBe(0);
  });

  it("canonicalizes the bare email confirmation link with its hash intact", () => {
    mount("/#/settings/email-confirmation?address=0xA&token=t", 1);
    expect(shows("home")).toBe(true);
    expect(page.currentUrl()).toBe("/1/#/settings/email-confirmation?address=0xA&token=t");
  });

  it.each(["/100/tokens", "/cases/5"])("writes nothing while the chain is unknown (%p)", (url) => {
    mount(url, undefined);
    expect(page.currentUrl()).toBe(url);
    expect(page.rewrites()).toBe(0);
  });

  it("moves tokens along when the wallet switches chain, but not a gated page", () => {
    mount("/1/tokens", 1);
    useChainId.mockReturnValue(100);
    page.rerender();
    expect(page.currentUrl()).toBe("/100/tokens");
    expect(page.rewrites()).toBe(1);
    page.unmount();

    mount("/1/courts", 1);
    useChainId.mockReturnValue(100);
    page.rerender();
    expect(page.currentUrl()).toBe("/1/courts");
    expect(page.rewrites()).toBe(0);
  });

  it("gives the case page both the chain and the dispute ID", () => {
    mount("/100/cases/5", 100);
    expect(JSON.parse(page.container.querySelector("#case").textContent)).toEqual({ chainId: "100", ID: "5" });
  });

  //Hand-crafted double-encoded IDs only: the Redirect decodes the pathname twice more after the load-time decode.
  it("crashes on a bare case URL whose ID decodes to a lone %", () => {
    allowConsoleError = true;
    console.error.mockImplementation(() => {});
    expect(() => mount("/cases/a%2525", 1)).toThrow(/could not be decoded/);
  });

  it("decodes a double-encoded bare case ID once more than the URL", () => {
    mount("/cases/%252541", 1);
    expect(page.currentUrl()).toBe("/1/cases/A");
    expect(JSON.parse(page.container.querySelector("#case").textContent).ID).toBe("A");
  });
});

describe("CanonicalChainUrl on Back and Forward", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("moves a page visited before a chain switch to the connected chain", () => {
    openOn(["/100/courts?x=1#h", "/1/tokens"], 1, 1);
    navigate((history) => history.goBack());
    expect(shows("courts")).toBe(true);
    expect(page.currentUrl()).toBe("/1/courts?x=1#h");
    expect(page.rewrites()).toBe(1);
  });

  it("moves every entry from before the switch, also two for the same page", () => {
    openOn(["/100/courts", "/100/cases", "/100/courts", "/1/tokens"], 3, 1);
    navigate((history) => history.goBack());
    navigate((history) => history.goBack());
    navigate((history) => history.goBack());
    expect(page.currentUrl()).toBe("/1/courts");
    expect(page.rewrites()).toBe(3);
  });

  it("does the same on Forward", () => {
    openOn(["/1/tokens", "/100/cases"], 0, 1);
    navigate((history) => history.goForward());
    expect(shows("cases")).toBe(true);
    expect(page.currentUrl()).toBe("/1/cases");
  });

  it("keeps the case page's chain, so the switch prompt asks for it", () => {
    openOn(["/100/cases/5", "/1/tokens"], 1, 1);
    navigate((history) => history.goBack());
    expect(page.container.querySelector("#case").textContent).toBe(JSON.stringify({ chainId: "100", ID: "5" }));
    expect(page.currentUrl()).toBe("/100/cases/5");
    expect(page.rewrites()).toBe(0);
  });

  it("keeps a link's chain when Back returns to the entry the page opened on", () => {
    mount("/100/courts", 1);
    navigate((history) => history.push("/1/cases"));
    navigate((history) => history.goBack());
    expect(page.currentUrl()).toBe("/100/courts");
    expect(page.rewrites()).toBe(0);
  });

  it("counts the entry a legacy link was redirected to as the one the page opened on", () => {
    mount("/courts?requiredChainId=100", 1);
    expect(page.currentUrl()).toBe("/100/courts");
    navigate((history) => history.push("/1/cases"));
    navigate((history) => history.goBack());
    expect(page.currentUrl()).toBe("/100/courts");
    expect(page.rewrites()).toBe(1);
  });

  //The switch-court fallback points the URL at the chain the user asked for, so the page asks to switch.
  it("keeps a replace to another chain, which is no history move", () => {
    mount("/1/courts", 1);
    navigate((history) => history.replace("/100/courts"));
    expect(page.currentUrl()).toBe("/100/courts");
    expect(page.rewrites()).toBe(1);
  });

  it("leaves pages alone on Back while the chain is unknown", () => {
    openOn(["/100/courts", "/1/tokens"], 1, undefined);
    navigate((history) => history.goBack());
    expect(page.currentUrl()).toBe("/100/courts");
    expect(page.rewrites()).toBe(0);
  });

  //In the browser a typed URL or a hash edited in the address bar makes an entry with no state, so no router key.
  describe("with the browser's history", () => {
    it("moves an entry with no key from before the switch, when the page also opened on one", async () => {
      //Typed /1/courts, edited the hash (a new keyless entry), then a switch to 100 rewrote it and reloaded.
      window.history.replaceState(null, "", "/1/courts");
      window.history.pushState(null, "", "/100/courts#top");
      mount(undefined, 100, undefined, createBrowserHistory());
      await traverse(() => page.history.goBack());
      expect(page.currentUrl()).toBe("/100/courts");
    });

    it("keeps a URL the app pointed at another chain, on a hash edit and on Back", async () => {
      window.history.replaceState(null, "", "/1/courts");
      mount(undefined, 1, undefined, createBrowserHistory());
      //The switch-court fallback asks for the switch through the URL.
      navigate((history) => history.replace("/100/courts"));
      await traverse(() => {
        window.history.pushState(null, "", "/100/courts#x");
        window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
      });
      expect(page.currentUrl()).toBe("/100/courts#x");
      navigate((history) => history.push("/1/cases"));
      await traverse(() => page.history.goBack());
      expect(page.currentUrl()).toBe("/100/courts#x");
      expect(page.rewrites()).toBe(1);
    });

    it("keeps a link's chain when only the hash is edited in the address bar", async () => {
      window.history.replaceState(null, "", "/courts?requiredChainId=100");
      mount(undefined, 1, undefined, createBrowserHistory());
      expect(page.currentUrl()).toBe("/100/courts");
      //A same-document fragment navigation: a new entry with no state, announced by popstate.
      await traverse(() => {
        window.history.pushState(null, "", "/100/courts#x");
        window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
      });
      expect(page.currentUrl()).toBe("/100/courts#x");
      expect(page.rewrites()).toBe(1);
    });

    it("moves a page whose entry has no key, from before the switch", async () => {
      window.history.replaceState(null, "", "/100/courts");
      window.history.pushState({ key: "tokens" }, "", "/1/tokens");
      mount(undefined, 1, undefined, createBrowserHistory());
      await traverse(() => page.history.goBack());
      expect(page.currentUrl()).toBe("/1/courts");
      expect(window.location.pathname).toBe("/1/courts");
    });

    it("moves a page on Forward when the page opened on an entry with no key", async () => {
      window.history.replaceState(null, "", "/1/courts");
      window.history.pushState({ key: "cases" }, "", "/100/cases");
      await traverse(() => window.history.back());
      mount(undefined, 1, undefined, createBrowserHistory());
      await traverse(() => page.history.goForward());
      expect(page.currentUrl()).toBe("/1/cases");
    });

    it("keeps the chain of a typed link when Back returns to it", async () => {
      window.history.replaceState(null, "", "/100/courts");
      mount(undefined, 1, undefined, createBrowserHistory());
      navigate((history) => history.push("/1/cases"));
      await traverse(() => page.history.goBack());
      expect(page.currentUrl()).toBe("/100/courts");
      expect(page.rewrites()).toBe(0);
    });
  });
});

describe("ChainLink and ChainNavLink", () => {
  it("point at the connected chain, not the URL's", () => {
    const ref = React.createRef();
    mount("/100/courts", 1, () => (
      <>
        <ChainNavLink id="home" to="/">
          Home
        </ChainNavLink>
        <ChainLink id="case" ref={ref} to="/cases/5">
          Case
        </ChainLink>
      </>
    ));
    expect(page.container.querySelector("#home").getAttribute("href")).toBe("/1/");
    expect(page.container.querySelector("#case").getAttribute("href")).toBe("/1/cases/5");
    expect(ref.current).toBe(page.container.querySelector("#case"));
  });
});

describe("useReplaceChainInUrl", () => {
  let replaceChainInUrl;

  function Probe() {
    replaceChainInUrl = useReplaceChainInUrl();
    return null;
  }

  it("points the current URL at another chain in one replace", () => {
    mount("/100/cases/1000?x=1#h", 1, () => <Probe />);
    act(() => replaceChainInUrl(1));
    expect(page.currentUrl()).toBe("/1/cases/1000?x=1#h");
    expect(page.rewrites()).toBe(1);
    expect(page.history.length).toBe(1);
  });

  it("writes nothing when the URL already names the chain", () => {
    mount("/100/cases/1000?x=1#h", 1, () => <Probe />);
    act(() => replaceChainInUrl(100));
    expect(page.currentUrl()).toBe("/100/cases/1000?x=1#h");
    expect(page.rewrites()).toBe(0);
  });

  it("rewrites the location current at call time, even through a callback kept from before a navigation", () => {
    mount("/100/cases/1000", 1, () => <Probe />);
    //Callers keep the callback across an awaited wallet request, during which the URL can change.
    const keptReplaceChainInUrl = replaceChainInUrl;
    act(() => page.history.push("/1/courts"));
    act(() => keptReplaceChainInUrl(100));
    expect(page.currentUrl()).toBe("/100/courts");
  });
});
