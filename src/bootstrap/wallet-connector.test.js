import { connectWallet, detectWallets } from "./wallet-connector";
import { FALLBACK_CHAIN_ID_STORAGE_KEY } from "./drizzle";

const WALLET_ID = "io.test.wallet";
let calls;
const provider = {
  request: jest.fn(({ method, params }) => {
    calls.push([method, params]);
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
    await connectWallet(WALLET_ID);
    expect(switchRequests()).toEqual(["0x64"]);
  });

  it("falls back to the stored chain on a page whose URL names none", async () => {
    window.history.replaceState(null, "", "/foo");
    window.localStorage.setItem(FALLBACK_CHAIN_ID_STORAGE_KEY, "100");
    await connectWallet(WALLET_ID);
    expect(switchRequests()).toEqual(["0x64"]);
  });

  it("asks for no switch when neither the URL nor storage names a chain", async () => {
    window.history.replaceState(null, "", "/foo");
    await connectWallet(WALLET_ID);
    expect(switchRequests()).toEqual([]);
  });
});
