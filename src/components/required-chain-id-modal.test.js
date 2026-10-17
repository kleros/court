import React from "react";
import { act } from "react-dom/test-utils";
import RequiredChainIdModal from "./required-chain-id-modal";
import useAccount from "../hooks/use-account";
import useChainId from "../hooks/use-chain-id";
import { mountInRouter } from "../test-utils/memory-router";

jest.mock("../hooks/use-account", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@drizzle/react-plugin", () => ({
  drizzleReactHooks: { useDrizzle: () => ({ drizzle: { web3: { currentProvider: {} } } }) },
}));

let page;

function mount({ url, requiredChainId, chainId, account }) {
  useChainId.mockReturnValue(chainId);
  useAccount.mockReturnValue(account);
  page = mountInRouter(() => <RequiredChainIdModal requiredChainId={requiredChainId} />, { url });
}

//The modal renders into a portal on document.body, outside the router's container.
const find = (selector) => document.body.querySelector(selector);

afterEach(() => {
  page.unmount();
  document.body.innerHTML = "";
});

describe("RequiredChainIdModal", () => {
  it("Cancel moves the URL to the connected chain in one replace, without a new history entry", () => {
    mount({ url: "/100/cases/5?x=1#h", requiredChainId: 100, chainId: 1, account: "0xabc" });

    act(() => {
      find(".ant-modal-close").click();
    });

    expect(page.currentUrl()).toBe("/1/cases/5?x=1#h");
    expect(page.rewrites()).toBe(1);
    expect(page.history.length).toBe(1);
  });

  it("shows nothing without an account", () => {
    mount({ url: "/100/cases/5", requiredChainId: 100, chainId: 1, account: undefined });
    expect(find(".ant-modal")).toBeNull();
  });

  it.each([
    ["shows the Switch button for a side chain", 100, 1, true],
    ["shows only text for mainnet", 1, 100, false],
  ])("%s", (_, requiredChainId, chainId, hasSwitchButton) => {
    mount({ url: `/${requiredChainId}/cases/5`, requiredChainId, chainId, account: "0xabc" });
    expect(find(".ant-modal")).not.toBeNull();
    expect(find(".ant-modal-footer button") !== null).toBe(hasSwitchButton);
  });
});
