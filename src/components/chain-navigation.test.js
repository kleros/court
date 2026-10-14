import React from "react";
import { act } from "react-dom/test-utils";
import { Route, Switch, useParams } from "react-router-dom";
import { CanonicalChainUrl, ChainLink, ChainNavLink, useReplaceChainInUrl } from "./chain-navigation";
import { chainRoutePath, pagePaths } from "../helpers/chain-url";
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

function mount(url, chainId, renderTree = () => <Pages />) {
  useChainId.mockReturnValue(chainId);
  page = mountInRouter(renderTree, { url });
  return page;
}

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
