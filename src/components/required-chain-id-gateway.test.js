import React from "react";
import { Route } from "react-router-dom";
import RequiredChainIdGateway from "./required-chain-id-gateway";
import useChainId from "../hooks/use-chain-id";
import useAccount from "../hooks/use-account";
import { CHAIN_ID_ROUTE } from "../helpers/chain-url";
import { mountInRouter } from "../test-utils/memory-router";

jest.mock("../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../hooks/use-account", () => ({ __esModule: true, default: jest.fn() }));

const RELOAD_MARKER = "@@kleros/court/view-only-reload";
let reloadSpy;

let page;

function tree() {
  return (
    <Route path={CHAIN_ID_ROUTE}>
      <RequiredChainIdGateway renderOnMismatch={({ requiredChainId }) => <div id="mismatch">{requiredChainId}</div>}>
        <div id="content" />
      </RequiredChainIdGateway>
    </Route>
  );
}

//`account: null` means view-only (an undefined value would take the default). The app's BrowserRouter keeps window.location in step with the route; do the same here.
function mount({ url, chainId, account = "0xabc" }) {
  useChainId.mockReturnValue(chainId);
  useAccount.mockReturnValue(account);
  window.history.replaceState(null, "", url);
  page = mountInRouter(tree, { url });
  return {
    //Re-renders with a new wallet chain, like a chainChanged event does. The router keeps its state.
    switchWalletTo(nextChainId) {
      useChainId.mockReturnValue(nextChainId);
      page.rerender();
    },
  };
}

const shows = (id) => page.container.querySelector(`#${id}`) !== null;

beforeEach(() => {
  reloadSpy = jest.spyOn(window.location, "reload").mockImplementation(() => {});
});

afterEach(() => {
  page.unmount();
  jest.restoreAllMocks();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("RequiredChainIdGateway", () => {
  it("shows the content when the URL names the wallet chain", () => {
    mount({ url: "/1/cases/1", chainId: 1 });
    expect(shows("content")).toBe(true);
    expect(shows("mismatch")).toBe(false);
    expect(page.rewrites()).toBe(0);
  });

  it("shows the switch prompt and keeps the URL when it names another chain", () => {
    mount({ url: "/100/cases/1?x=1#h", chainId: 1 });
    expect(shows("mismatch")).toBe(true);
    expect(page.container.querySelector("#mismatch").textContent).toBe("100");
    expect(shows("content")).toBe(false);
    expect(page.currentUrl()).toBe("/100/cases/1?x=1#h");
    expect(page.rewrites()).toBe(0);
  });

  it("leaves the URL alone when the chain is not known yet", () => {
    mount({ url: "/100/cases/1", chainId: undefined });
    expect(page.currentUrl()).toBe("/100/cases/1");
    expect(page.rewrites()).toBe(0);
  });

  describe("without a wallet", () => {
    it("shows the content when the URL names the loaded chain, without reloading", () => {
      mount({ url: "/100/courts", chainId: 100, account: null });
      expect(shows("content")).toBe(true);
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it("reloads onto the URL's chain when an in-page navigation names another one, showing the spinner", () => {
      mount({ url: "/11155111/courts", chainId: 100, account: null });
      expect(reloadSpy).toHaveBeenCalledTimes(1);
      expect(window.sessionStorage.getItem(RELOAD_MARKER)).toBe("/11155111/courts");
      expect(shows("mismatch")).toBe(false);
      expect(shows("content")).toBe(false);
      expect(page.container.textContent).toContain("Switching network…");
    });

    it("keeps the spinner on a re-render while the reload is in flight", () => {
      mount({ url: "/11155111/courts", chainId: 100, account: null });
      page.rerender();
      expect(reloadSpy).toHaveBeenCalledTimes(1);
      expect(shows("mismatch")).toBe(false);
      expect(page.container.textContent).toContain("Switching network…");
    });

    it("reloads at most once for the same URL, then keeps the mismatch rendering", () => {
      window.sessionStorage.setItem(RELOAD_MARKER, "/11155111/courts");
      mount({ url: "/11155111/courts", chainId: 100, account: null });
      expect(reloadSpy).not.toHaveBeenCalled();
      expect(shows("mismatch")).toBe(true);
    });

    it("never reloads when session storage is unavailable", () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      mount({ url: "/11155111/courts", chainId: 100, account: null });
      expect(reloadSpy).not.toHaveBeenCalled();
      expect(shows("mismatch")).toBe(true);
    });

    it("never reloads when the marker cannot be saved, and keeps the mismatch rendering", () => {
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      mount({ url: "/11155111/courts", chainId: 100, account: null });
      expect(reloadSpy).not.toHaveBeenCalled();
      expect(shows("mismatch")).toBe(true);
    });

    it("does not reload while the chain is not known yet", () => {
      mount({ url: "/100/courts", chainId: undefined, account: null });
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it("clears the marker once a page matches, so a later mismatch reloads again", () => {
      window.sessionStorage.setItem(RELOAD_MARKER, "/11155111/courts");
      mount({ url: "/100/courts", chainId: 100, account: null });
      expect(window.sessionStorage.getItem(RELOAD_MARKER)).toBe(null);
    });
  });

  it("never reloads with a wallet: the switch prompt handles the mismatch", () => {
    mount({ url: "/100/cases/1", chainId: 1, account: "0xabc" });
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(shows("mismatch")).toBe(true);
  });
});
