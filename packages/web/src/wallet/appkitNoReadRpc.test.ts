import "./testing/refusedRelay";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ModalController } from "@reown/appkit-controllers";
import { gnosis, gnosisChiado, sepolia } from "@reown/appkit/networks";
import { readEnv } from "@court/core";
import { initWallet } from "./init";
import { activeNetwork, announceWallet, connectInAppKit, hex, leaveAppKitOn } from "./testing/fakeWallet";

/*
 * The page started with a Reown project id and no read RPC of its own: AppKit's networks then lead with Reown's RPC,
 * whose URL carries the project id. One AppKit for the whole file (its controllers are module singletons), started as
 * the page starts it, on the network an earlier visit stored. Unit tests make no network requests (WalletConnect's
 * relay is refused).
 */

const PROJECT_ID = "5ca1ab1e5ca1ab1e5ca1ab1e5ca1ab1e";
const ENV = readEnv({ REACT_APP_WALLETCONNECT_PROJECT_ID: PROJECT_ID });

let wallet: ReturnType<typeof announceWallet>;

function expectOnlyPublicRpcAdded(
  added: readonly Record<string, unknown>[],
  network: typeof gnosis | typeof sepolia | typeof gnosisChiado,
): void {
  expect(added).toEqual([
    expect.objectContaining({ chainId: hex(network.id), rpcUrls: [network.rpcUrls.default.http[0]] }),
  ]);
  expect(JSON.stringify(added)).not.toContain(PROJECT_ID);
  expect(JSON.stringify(added)).not.toContain("walletconnect");
}

beforeAll(async () => {
  vi.stubGlobal("fetch", () => Promise.reject(new Error("unit tests make no network requests")));
  // jsdom has none; AppKit's window uses it once it opens.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = () => undefined;
      unobserve = () => undefined;
      disconnect = () => undefined;
    },
  );
  localStorage.clear();
  // AppKit's network from an earlier visit, which ended with the wallet disconnected on Gnosis.
  localStorage.setItem("@appkit/active_caip_network_id", "eip155:100");
  wallet = announceWallet();
  await initWallet(ENV, "https://court.example");
});

afterAll(() => {
  wallet.stop();
  ModalController.close();
  vi.unstubAllGlobals();
});

describe("Connect, with no read RPC configured, while AppKit is on a network the wallet lacks", () => {
  it("adds the network stored by an earlier visit with its public RPC, never Reown's", async () => {
    expect(activeNetwork()).toBe("eip155:100");
    await connectInAppKit();
    expectOnlyPublicRpcAdded(wallet.added, gnosis);
  });

  it.each([sepolia, gnosisChiado])("adds it with its public RPC, never Reown's: $name", async (network) => {
    await leaveAppKitOn(wallet, network.id);
    const before = wallet.added.length;
    await connectInAppKit();
    expectOnlyPublicRpcAdded(wallet.added.slice(before), network);
  });
});
