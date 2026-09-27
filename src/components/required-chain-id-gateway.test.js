import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import RequiredChainIdGateway from "./required-chain-id-gateway";
import useChainId from "../hooks/use-chain-id";

jest.mock("../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));

const MAX_REWRITES = 20;

let container;
let history;
let rewrites;

function tree({ keepChainIdInUrl }) {
  return (
    <Router history={history}>
      <RequiredChainIdGateway
        keepChainIdInUrl={keepChainIdInUrl}
        renderOnMismatch={({ requiredChainId }) => <div id="mismatch">{requiredChainId}</div>}
      >
        <div id="content" />
      </RequiredChainIdGateway>
    </Router>
  );
}

function mount({ url, chainId, keepChainIdInUrl = false }) {
  history = createMemoryHistory({ initialEntries: [url] });
  rewrites = 0;
  history.listen((_, action) => {
    if (action !== "REPLACE") return;
    rewrites += 1;
    //A runaway gateway rewrites the same URL forever. Fail fast instead of hanging the test.
    if (rewrites > MAX_REWRITES) throw new Error(`URL rewritten more than ${MAX_REWRITES} times: replace loop`);
  });
  useChainId.mockReturnValue(chainId);
  act(() => {
    ReactDOM.render(tree({ keepChainIdInUrl }), container);
  });
  return {
    //Re-renders with a new wallet chain, like a chainChanged event does. The router keeps its state.
    switchWalletTo(nextChainId) {
      useChainId.mockReturnValue(nextChainId);
      act(() => {
        ReactDOM.render(tree({ keepChainIdInUrl }), container);
      });
    },
  };
}

const currentUrl = () => history.location.pathname + history.location.search;
const shows = (id) => container.querySelector(`#${id}`) !== null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
  container.remove();
});

describe("RequiredChainIdGateway", () => {
  it("shows the switch prompt on a fresh load when the URL names another chain", () => {
    mount({ url: "/cases/1?requiredChainId=100", chainId: 1 });
    expect(shows("mismatch")).toBe(true);
    expect(shows("content")).toBe(false);
    expect(currentUrl()).toBe("/cases/1?requiredChainId=100");
    expect(rewrites).toBe(0);
  });

  it("shows the content and strips the param once, when the chains match outside the case page", () => {
    mount({ url: "/cases?requiredChainId=1", chainId: 1 });
    expect(shows("content")).toBe(true);
    expect(currentUrl()).toBe("/cases");
    expect(rewrites).toBe(1);
  });

  it("adds the wallet chain to the URL once, when it is missing on the case page", () => {
    mount({ url: "/cases/1", chainId: 1, keepChainIdInUrl: true });
    expect(shows("content")).toBe(true);
    expect(currentUrl()).toBe("/cases/1?requiredChainId=1");
    expect(rewrites).toBe(1);
  });

  it("keeps a matching param on the case page without touching the URL", () => {
    mount({ url: "/cases/1?requiredChainId=100", chainId: 100, keepChainIdInUrl: true });
    expect(shows("content")).toBe(true);
    expect(currentUrl()).toBe("/cases/1?requiredChainId=100");
    expect(rewrites).toBe(0);
  });

  it("never overwrites a different param on the case page, so the switch prompt still shows", () => {
    mount({ url: "/cases/1?requiredChainId=100", chainId: 1, keepChainIdInUrl: true });
    expect(shows("mismatch")).toBe(true);
    expect(currentUrl()).toBe("/cases/1?requiredChainId=100");
    expect(rewrites).toBe(0);
  });

  it("replaces an invalid param with the wallet chain on the case page", () => {
    mount({ url: "/cases/1?requiredChainId=abc", chainId: 1, keepChainIdInUrl: true });
    expect(shows("content")).toBe(true);
    expect(currentUrl()).toBe("/cases/1?requiredChainId=1");
    expect(rewrites).toBeLessThanOrEqual(2);
  });

  it("leaves the URL alone when the chain is not known yet, instead of rewriting it forever", () => {
    mount({ url: "/cases", chainId: undefined });
    expect(currentUrl()).toBe("/cases");
    expect(rewrites).toBe(0);
  });

  it("shows a spinner while the wallet switches chain, instead of flashing the switch prompt or stale content", () => {
    const page = mount({ url: "/cases/1?requiredChainId=1", chainId: 1, keepChainIdInUrl: true });
    expect(shows("content")).toBe(true);

    page.switchWalletTo(100);

    expect(shows("mismatch")).toBe(false);
    expect(shows("content")).toBe(false);
    expect(container.querySelector(".ant-spin")).not.toBeNull();
  });
});
