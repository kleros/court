import React from "react";
import { Route } from "react-router-dom";
import SwitchingNetwork from "./switching-network";
import RequiredChainIdGateway from "./required-chain-id-gateway";
import { CanonicalChainUrl } from "./chain-navigation";
import useChainId from "../hooks/use-chain-id";
import { CHAIN_ID_ROUTE } from "../helpers/chain-url";
import { mountInRouter } from "../test-utils/memory-router";

jest.mock("../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));
//A connected wallet: these tests are about the reload after a wallet chain change.
jest.mock("../hooks/use-account", () => ({ __esModule: true, default: () => "0xabc" }));

let page;

//Like app.js: every page sits under SwitchingNetwork, gated pages also under the gateway.
function gatedPage() {
  return (
    <SwitchingNetwork>
      <Route path={CHAIN_ID_ROUTE}>
        <RequiredChainIdGateway renderOnMismatch={({ requiredChainId }) => <div id="mismatch">{requiredChainId}</div>}>
          <div id="content" />
        </RequiredChainIdGateway>
      </Route>
    </SwitchingNetwork>
  );
}

//Tokens follows the connected chain through CanonicalChainUrl, which sits under SwitchingNetwork as in app.js.
function ungatedPage() {
  return (
    <SwitchingNetwork>
      <CanonicalChainUrl>
        <div id="content" />
      </CanonicalChainUrl>
    </SwitchingNetwork>
  );
}

function mount(tree, { url, chainId }) {
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
const showsSpinner = () => page.container.querySelector(".ant-spin") !== null;

afterEach(() => {
  page.unmount();
});

describe("SwitchingNetwork", () => {
  it("does not treat discovering the chain after mount as a pending reload", () => {
    const wallet = mount(gatedPage, { url: "/1/cases/1", chainId: undefined });

    wallet.switchWalletTo(1);

    expect(showsSpinner()).toBe(false);
    expect(shows("content")).toBe(true);

    wallet.switchWalletTo(100);

    expect(showsSpinner()).toBe(true);
  });

  it("shows a spinner while the wallet switches chain, instead of flashing the switch prompt or stale content", () => {
    const wallet = mount(gatedPage, { url: "/1/cases/1", chainId: 1 });
    expect(shows("content")).toBe(true);

    wallet.switchWalletTo(100);

    expect(shows("mismatch")).toBe(false);
    expect(shows("content")).toBe(false);
    expect(showsSpinner()).toBe(true);
    expect(page.container.textContent).toContain("Switching network…");
  });

  it("covers pages without a gateway too, such as tokens", () => {
    const wallet = mount(ungatedPage, { url: "/1/tokens", chainId: 1 });
    expect(shows("content")).toBe(true);

    wallet.switchWalletTo(100);

    expect(shows("content")).toBe(false);
    expect(showsSpinner()).toBe(true);
    //The redirect to the new chain's tokens page waits for the reload, so the page does not remount on the new chain.
    expect(page.currentUrl()).toBe("/1/tokens");
    expect(page.rewrites()).toBe(0);
  });
});
