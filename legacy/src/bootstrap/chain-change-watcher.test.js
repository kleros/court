import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import ChainChangeWatcher from "./chain-change-watcher";
import useChainId from "../hooks/use-chain-id";
import { toPath } from "../helpers/chain-url";

jest.mock("../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../components/error-fallback/switch-chain", () => ({
  __esModule: true,
  default: function SwitchChainFallback() {
    return <div id="switch-chain-fallback" />;
  },
}));

let container;
let reloads;
let reloadSpy;

function renderOnChain(chainId) {
  useChainId.mockReturnValue(chainId);
  act(() => {
    ReactDOM.render(
      <ChainChangeWatcher>
        <div id="content" />
      </ChainChangeWatcher>,
      container
    );
  });
}

//Mounts on `fromChainId` at `url`, then the wallet moves to `toChainId`.
function switchChain(url, fromChainId, toChainId) {
  window.history.replaceState(null, "", url);
  renderOnChain(fromChainId);
  renderOnChain(toChainId);
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  reloads = [];
  //Record the URL the reload would load.
  reloadSpy = jest.spyOn(window.location, "reload").mockImplementation(() => reloads.push(toPath(window.location)));
});

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
  container.remove();
  reloadSpy.mockRestore();
  window.history.replaceState(null, "", "/");
});

describe("ChainChangeWatcher", () => {
  it("points a prefixed URL at the new chain before reloading", () => {
    switchChain("/100/cases/1000?x=1#h", 100, 1);
    expect(reloads).toEqual(["/1/cases/1000?x=1#h"]);
  });

  it("prefixes a bare URL, which a chain change can reach before the router canonicalizes it", () => {
    switchChain("/cases/1000", 1, 100);
    expect(reloads).toEqual(["/100/cases/1000"]);
  });

  it("drops the legacy param in favor of the prefix", () => {
    switchChain("/cases/1?requiredChainId=1&x=1", 1, 100);
    expect(reloads).toEqual(["/100/cases/1?x=1"]);
  });

  it("prefixes an unknown path too, so the reload lands on the new chain", () => {
    switchChain("/foo", 1, 100);
    expect(reloads).toEqual(["/100/foo"]);
  });

  it("does not reload when the chain is first discovered", () => {
    switchChain("/cases/1", undefined, 1);
    expect(reloads).toEqual([]);
    expect(container.querySelector("#content")).not.toBeNull();
  });

  it("does not reload onto an unsupported chain, and shows the switch fallback", () => {
    switchChain("/1/cases/1", 1, 5);
    expect(reloads).toEqual([]);
    expect(window.location.pathname).toBe("/1/cases/1");
    expect(container.querySelector("#switch-chain-fallback")).not.toBeNull();
  });
});
