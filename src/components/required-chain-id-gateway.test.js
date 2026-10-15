import React from "react";
import { Route } from "react-router-dom";
import RequiredChainIdGateway from "./required-chain-id-gateway";
import useChainId from "../hooks/use-chain-id";
import { CHAIN_ID_ROUTE } from "../helpers/chain-url";
import { mountInRouter } from "../test-utils/memory-router";

jest.mock("../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));

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

function mount({ url, chainId }) {
  useChainId.mockReturnValue(chainId);
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

afterEach(() => {
  page.unmount();
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
});
