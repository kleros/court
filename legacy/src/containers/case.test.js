import React from "react";
import { act } from "react-dom/test-utils";
import { Route } from "react-router-dom";
import Case from "./case";
import useChainId from "../hooks/use-chain-id";
import { chainRoutePath, pagePaths } from "../helpers/chain-url";
import { mountInRouter } from "../test-utils/memory-router";

jest.mock("../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../hooks/use-get-draws", () => ({ __esModule: true, default: () => [] }));
jest.mock("../components/case-details-card.jsx", () => ({ __esModule: true, default: () => null }));
jest.mock("../bootstrap/dataloader", () => ({ VIEW_ONLY_ADDRESS: "0x0000000000000000000000000000000000000000" }));
jest.mock("../api/side-chain", () => ({ ...jest.requireActual("../api/side-chain"), requestSwitchChain: jest.fn() }));
//A dispute ID the chain has never seen: the contract returns an empty dispute whose last period change is the epoch,
//which the case page reads as "too old", i.e. not on this chain.
jest.mock("@drizzle/react-plugin", () => {
  const { utils } = require("web3");
  const call = (_, method) =>
    method === "getSubcourt" ? { timesPerPeriod: ["0", "0", "0", "0"] } : { hiddenVotes: false };
  const useCacheCall = (contract, method) => {
    if (Array.isArray(contract)) return method(call);
    if (method === "disputes") return { ruled: false, period: "0", lastPeriodChange: "0", subcourtID: "0" };
    return { tokensAtStakePerJuror: [] };
  };
  const drizzle = {
    web3: { utils, currentProvider: {} },
    contracts: { KlerosLiquid: { methods: { disputes: () => ({ call: () => Promise.resolve({}) }) } } },
  };
  return {
    drizzleReactHooks: {
      useDrizzle: () => ({ drizzle, useCacheCall, useCacheSend: () => ({ send: () => {} }) }),
      useDrizzleState: (select) => select({ accounts: [] }),
    },
  };
});

let page;

beforeEach(() => {
  //antd's modal closes with an animation on timers; fake timers let it finish before unmounting.
  jest.useFakeTimers();
  useChainId.mockReturnValue(100);
  page = mountInRouter(
    () => (
      <Route path={chainRoutePath(pagePaths.case)}>
        <Case />
      </Route>
    ),
    { url: "/100/cases/1680" }
  );
});

afterEach(() => {
  //The close animation chains timers, so run them all, not only those pending now.
  act(() => {
    jest.runAllTimers();
  });
  page.unmount();
  document.body.innerHTML = "";
  jest.useRealTimers();
});

const visibleModalTitle = () =>
  document.querySelector(".ant-modal-wrap:not([style*='display: none']) .ant-modal-title")?.textContent ?? null;
const shows404 = () => page.container.textContent.includes("Something went wrong in Athens!");

describe("Case, for a dispute that does not exist on the connected chain", () => {
  it("asks to switch to Mainnet, over the 404 page", () => {
    expect(visibleModalTitle()).toBe("Dispute Not Found");
    expect(shows404()).toBe(true);
  });

  it("leaves the 404 page, not a blank one, once the modal is closed", () => {
    act(() => {
      document.querySelector(".ant-modal-close").click();
    });
    act(() => {
      jest.runAllTimers();
    });

    expect(visibleModalTitle()).toBe(null);
    expect(shows404()).toBe(true);
  });
});
