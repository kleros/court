import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import WalletConnector from "./wallet-connector";
import { connectWallet, detectWallets } from "../bootstrap/wallet-connector";
import { toPath } from "../helpers/chain-url";

jest.mock("../bootstrap/wallet-connector", () => ({ connectWallet: jest.fn(), detectWallets: jest.fn() }));
jest.mock("../bootstrap/dataloader", () => ({ VIEW_ONLY_ADDRESS: "0x0000000000000000000000000000000000000000" }));
//No wallet account yet: the Connect Wallet button is shown.
jest.mock("@drizzle/react-plugin", () => ({
  drizzleReactHooks: { useDrizzleState: (select) => select({ accounts: [] }) },
}));

let container;
let reloadedAt;

beforeEach(() => {
  //antd's modal closes with an animation on timers; fake timers let it finish before unmounting.
  jest.useFakeTimers();
  reloadedAt = [];
  //Records the address bar at reload time: the new document boots on whatever chain it names.
  jest.spyOn(window.location, "reload").mockImplementation(() => reloadedAt.push(toPath(window.location)));
  detectWallets.mockReturnValue([{ id: "mock", name: "Mock Wallet", icon: "" }]);
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  //The close animation chains timers, so run them all, not only those pending now.
  act(() => {
    jest.runAllTimers();
  });
  ReactDOM.unmountComponentAtNode(container);
  jest.useRealTimers();
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  connectWallet.mockReset();
  window.history.replaceState(null, "", "/");
});

//Connects from `url` with a wallet that ends up on `walletChain` (what eth_chainId returns), or whose chain cannot be read (an Error).
//`switched` is whether the wallet accepted the switch to the page's chain; these tests decline it unless they say otherwise.
async function connectFrom(url, walletChain, { switched = false } = {}) {
  window.history.replaceState(null, "", url);
  const request = jest.fn(() =>
    walletChain instanceof Error ? Promise.reject(walletChain) : Promise.resolve(walletChain)
  );
  connectWallet.mockResolvedValue({ provider: { request }, switched });
  act(() => {
    ReactDOM.render(<WalletConnector />, container);
  });
  act(() => {
    container.querySelector("button").click();
  });
  await act(async () => {
    [...document.querySelectorAll("strong")].find((el) => el.textContent === "Mock Wallet").parentElement.click();
  });
  return request;
}

describe("WalletConnector", () => {
  it("follows the wallet's chain on courts when the switch on connect was declined", async () => {
    const historyLength = window.history.length;
    const request = await connectFrom("/100/courts?x=1#h", "0x1");
    expect(request).toHaveBeenCalledWith({ method: "eth_chainId" });
    expect(reloadedAt).toEqual(["/1/courts?x=1#h"]);
    expect(window.history.length).toBe(historyLength);
  });

  it("reloads in place after an accepted switch, without asking the wallet for its chain", async () => {
    //The wallet still reports the old chain, as one that answers before it finishes switching would.
    const request = await connectFrom("/100/courts", "0x1", { switched: true });
    expect(request).not.toHaveBeenCalled();
    expect(reloadedAt).toEqual(["/100/courts"]);
  });

  it("also reads a wallet that reports its chain as a number", async () => {
    await connectFrom("/1/courts", 100);
    expect(reloadedAt).toEqual(["/100/courts"]);
  });

  it("keeps the case page's chain, so the mismatch modal asks to switch", async () => {
    await connectFrom("/100/cases/5", "0x1");
    expect(reloadedAt).toEqual(["/100/cases/5"]);
  });

  //The router decodes the path, so these are courts and a case page. Only the prefix is rewritten; the rest stays as typed.
  it("reads the page as the router does on a hand-encoded path", async () => {
    await connectFrom("/100/%63ourts", "0x1");
    expect(reloadedAt).toEqual(["/1/%63ourts"]);
  });

  it("keeps the case page's chain on a hand-encoded path", async () => {
    await connectFrom("/100/%63ases/5", "0x1");
    expect(reloadedAt).toEqual(["/100/%63ases/5"]);
  });

  it("reads the page after the wallet answers, so a navigation meanwhile keeps the case page's chain", async () => {
    let answer;
    await connectFrom(
      "/100/courts",
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    window.history.replaceState(null, "", "/100/cases/5");
    await act(async () => {
      answer("0x1");
    });
    expect(reloadedAt).toEqual(["/100/cases/5"]);
  });

  it("reloads in place when the wallet's chain cannot be read", async () => {
    await connectFrom("/100/courts", new Error("eth_chainId failed"));
    expect(reloadedAt).toEqual(["/100/courts"]);
  });
});
