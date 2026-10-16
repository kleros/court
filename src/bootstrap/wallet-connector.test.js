import { connectWallet, detectWallets } from "./wallet-connector";
import { FALLBACK_CHAIN_ID_STORAGE_KEY } from "./drizzle";

const WALLET_ID = "io.test.wallet";
let calls;
let declinesSwitch;
const provider = {
  request: jest.fn(({ method, params }) => {
    calls.push([method, params]);
    if (method === "wallet_switchEthereumChain" && declinesSwitch) {
      return Promise.reject({ code: 4001 });
    }
    return Promise.resolve(method === "eth_requestAccounts" ? ["0xabc"] : null);
  }),
};

beforeAll(() => {
  //detectWallets starts listening for EIP-6963 announcements, then the test wallet announces itself.
  detectWallets();
  window.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: { info: { rdns: WALLET_ID, name: "Test Wallet" }, provider },
    })
  );
});

beforeEach(() => {
  calls = [];
  declinesSwitch = false;
});

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

const switchRequests = () =>
  calls.filter(([method]) => method === "wallet_switchEthereumChain").map(([, params]) => params[0].chainId);

describe("connectWallet", () => {
  it("asks the wallet for the URL's chain, even when another tab stored a different one", async () => {
    window.history.replaceState(null, "", "/100/courts");
    window.localStorage.setItem(FALLBACK_CHAIN_ID_STORAGE_KEY, "1");
    const { switched } = await connectWallet(WALLET_ID);
    expect(switchRequests()).toEqual(["0x64"]);
    expect(switched).toBe(true);
  });

  it("reads a percent-encoded prefix like the router", async () => {
    window.history.replaceState(null, "", "/%31%30%30/courts");
    window.localStorage.setItem(FALLBACK_CHAIN_ID_STORAGE_KEY, "1");
    await connectWallet(WALLET_ID);
    expect(switchRequests()).toEqual(["0x64"]);
  });

  it("falls back to the stored chain on a page whose URL names none", async () => {
    window.history.replaceState(null, "", "/foo");
    window.localStorage.setItem(FALLBACK_CHAIN_ID_STORAGE_KEY, "100");
    const { switched } = await connectWallet(WALLET_ID);
    expect(switchRequests()).toEqual(["0x64"]);
    expect(switched).toBe(true);
  });

  it("asks for no switch when neither the URL nor storage names a chain", async () => {
    window.history.replaceState(null, "", "/foo");
    const { provider: connected, switched } = await connectWallet(WALLET_ID);
    expect(switchRequests()).toEqual([]);
    expect(switched).toBe(false);
    expect(connected).toBe(provider);
  });

  it("reports a declined switch, so the page can follow the wallet's chain", async () => {
    window.history.replaceState(null, "", "/100/courts");
    declinesSwitch = true;
    const { switched } = await connectWallet(WALLET_ID);
    expect(switchRequests()).toEqual(["0x64"]);
    expect(switched).toBe(false);
  });
});
