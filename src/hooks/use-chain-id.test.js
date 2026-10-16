import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import useChainId, { ChainIdProvider } from "./use-chain-id";

let container;
let listeners;
let mounts;

//A provider that starts on `chainId` and lets the test emit wallet events.
function fakeWeb3(chainId) {
  listeners = {};
  return {
    eth: { getChainId: () => Promise.resolve(chainId) },
    currentProvider: {
      on: (event, handler) => {
        listeners[event] = handler;
      },
      removeListener: () => {},
    },
  };
}

const emitChainChanged = (payload) =>
  act(() => {
    listeners.chainChanged(payload);
  });

function Probe() {
  const chainId = useChainId();
  React.useEffect(() => {
    mounts += 1;
  }, []);
  return <div id="chain">{chainId}</div>;
}

const shownChain = () => container.querySelector("#chain")?.textContent ?? null;

beforeEach(async () => {
  mounts = 0;
  container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    ReactDOM.render(
      <ChainIdProvider web3={fakeWeb3(1)}>
        <Probe />
      </ChainIdProvider>,
      container
    );
  });
});

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
  container.remove();
});

describe("ChainIdProvider", () => {
  it("follows a chainChanged event", () => {
    expect(shownChain()).toBe("1");
    emitChainChanged("0x64");
    expect(shownChain()).toBe("100");
  });

  it.each(["0x", "", "0x0"])(
    "ignores a chainChanged payload that is no chain id (%p) and keeps the app mounted",
    (payload) => {
      emitChainChanged(payload);
      expect(shownChain()).toBe("1");

      emitChainChanged("0x64");
      expect(shownChain()).toBe("100");
      //Still the first mount: the app below the provider never unmounted, so the reload on a chain change still happens.
      expect(mounts).toBe(1);
    }
  );

  it("still passes an unsupported chain on, for the unsupported-network fallback", () => {
    emitChainChanged("0x38");
    expect(shownChain()).toBe("56");
  });
});
