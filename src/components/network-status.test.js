import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import NetworkStatus from "./network-status";
import useChainId from "../hooks/use-chain-id";
import { requestSwitchChain } from "../api/side-chain";
import { toPath } from "../helpers/chain-url";

jest.mock("../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../bootstrap/dataloader", () => ({ VIEW_ONLY_ADDRESS: "0x0000000000000000000000000000000000000000" }));
jest.mock("../api/side-chain", () => ({ requestSwitchChain: jest.fn() }));
jest.mock("../bootstrap/drizzle", () => ({ useDrizzle: () => ({ drizzle: { web3: { currentProvider: {} } } }) }));
//No wallet account: the app runs view-only.
jest.mock("@drizzle/react-plugin", () => ({
  drizzleReactHooks: { useDrizzleState: (select) => select({ accounts: [], web3: { status: "initialized" } }) },
}));

let container;
let reloadedAt;

beforeEach(() => {
  jest.useFakeTimers();
  reloadedAt = [];
  //Records the address bar at reload time: the new document boots on whatever chain it names.
  jest.spyOn(window.location, "reload").mockImplementation(() => reloadedAt.push(toPath(window.location)));
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
  document.body.innerHTML = "";
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

function pickChain(name) {
  act(() => {
    container.querySelector(".ant-badge").dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  act(() => {
    jest.runAllTimers();
  });
  const item = [...document.querySelectorAll(".ant-menu-item")].find((li) => li.textContent === name);
  act(() => {
    item.click();
  });
}

describe("NetworkStatus", () => {
  it("view-only: rewrites the prefix in place, keeping query and hash, then reloads", () => {
    window.history.replaceState(null, "", "/1/cases/5?x=1#h");
    const historyLength = window.history.length;
    useChainId.mockReturnValue(1);
    act(() => {
      ReactDOM.render(<NetworkStatus />, container);
    });

    pickChain("Gnosis Chain");

    expect(reloadedAt).toEqual(["/100/cases/5?x=1#h"]);
    expect(window.history.length).toBe(historyLength);
    expect(requestSwitchChain).not.toHaveBeenCalled();
  });
});
