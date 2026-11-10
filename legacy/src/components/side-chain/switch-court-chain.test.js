import React from "react";
import t from "prop-types";
import { act } from "react-dom/test-utils";
import { message } from "antd";
import { useGetPnk } from "./switch-court-chain";
import useChainId from "../../hooks/use-chain-id";
import { requestSwitchChain } from "../../api/side-chain";
import { mountInRouter } from "../../test-utils/memory-router";

jest.mock("../../hooks/use-chain-id", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../../api/side-chain", () => ({
  ...jest.requireActual("../../api/side-chain"),
  requestSwitchChain: jest.fn(),
}));
jest.mock("@drizzle/react-plugin", () => ({
  drizzleReactHooks: { useDrizzle: () => ({ drizzle: { web3: { currentProvider: {} } } }) },
}));

let page;
let getPnk;

function Probe({ destinationChainId }) {
  getPnk = useGetPnk(destinationChainId);
  return null;
}

Probe.propTypes = { destinationChainId: t.number.isRequired };

beforeEach(() => {
  useChainId.mockReturnValue(1);
  jest.spyOn(message, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  page = mountInRouter(() => <Probe destinationChainId={100} />, { url: "/1/courts" });
});

afterEach(() => {
  page.unmount();
  jest.restoreAllMocks();
  requestSwitchChain.mockReset();
});

async function clickGetPnk() {
  await act(async () => {
    await getPnk();
  });
}

describe("useGetPnk", () => {
  it("opens the tokens page through the router, then asks the wallet to switch", async () => {
    const urlsWhenSwitching = [];
    requestSwitchChain.mockImplementation(async () => urlsWhenSwitching.push(page.currentUrl()));

    await clickGetPnk();

    //The router knows the new page, so the address bar and the page agree whatever the wallet answers.
    expect(page.currentUrl()).toBe("/1/tokens");
    expect(page.history.action).toBe("PUSH");
    expect(page.history.length).toBe(2);
    //The URL already names the tokens page when the switch starts, so the reload after chainChanged lands there.
    expect(urlsWhenSwitching).toEqual(["/1/tokens"]);
    expect(requestSwitchChain).toHaveBeenCalledWith({}, 100);
    expect(message.error).not.toHaveBeenCalled();
  });

  it("says nothing when the user declines the switch", async () => {
    requestSwitchChain.mockRejectedValue({ code: 4001 });

    await clickGetPnk();

    expect(page.currentUrl()).toBe("/1/tokens");
    expect(message.error).not.toHaveBeenCalled();
  });

  it("asks the user to switch in the wallet when the wallet cannot switch", async () => {
    requestSwitchChain.mockRejectedValue({ code: -32603 });

    await clickGetPnk();

    expect(page.currentUrl()).toBe("/1/tokens");
    expect(message.error).toHaveBeenCalledWith({
      content: "Failed to switch network. Please switch to Gnosis Chain in your wallet.",
      key: "switch-chain",
    });
  });
});
