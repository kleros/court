import { expect, vi } from "vitest";
import { ChainController, ConnectionController, ConnectorController } from "@reown/appkit-controllers";
import { mainnet } from "@reown/appkit/networks";

// Test support for the wallet's unit tests only: never imported by app code.

export const ACCOUNT = "0x1111111111111111111111111111111111111111";
const WALLET_ID = "io.test.mockwallet";

type Listener = (value: unknown) => void;
interface Request {
  readonly method: string;
  readonly params?: unknown;
}

export const hex = (chainId: number) => `0x${chainId.toString(16)}`;
const rpcError = (code: number, message: string) => Object.assign(new Error(message), { code });

export const WAIT = { timeout: 3000, interval: 20 };
export const activeNetwork = () => ChainController.state.activeCaipNetwork?.caipNetworkId;
export const accountStatus = () => ChainController.getAccountData("eip155")?.status;

/**
 * A browser wallet on Ethereum, announced as EIP-6963 announces one. It knows only the chains it was on or was asked to
 * add (4902 otherwise), and moves to a chain once it has added it, as MetaMask does.
 */
export function announceWallet() {
  const listeners = new Map<string, Set<Listener>>();
  const known = new Set<number>([mainnet.id]);
  const added: Record<string, unknown>[] = [];
  let chainId: number = mainnet.id;
  let accounts = [ACCOUNT];
  let switches = true;
  const emit = (event: string, value: unknown) => {
    for (const listener of listeners.get(event) ?? []) listener(value);
  };
  const moveTo = (id: number) => {
    known.add(id);
    chainId = id;
    emit("chainChanged", hex(id));
  };
  const provider = {
    request({ method, params }: Request): Promise<unknown> {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return Promise.resolve(accounts);
        case "eth_chainId":
          return Promise.resolve(hex(chainId));
        case "wallet_switchEthereumChain": {
          const target = Number((params as [{ chainId: string }])[0].chainId);
          if (!switches) return Promise.reject(rpcError(4200, `${method} is not supported`));
          if (!known.has(target)) return Promise.reject(rpcError(4902, "Unrecognized chain ID"));
          moveTo(target);
          return Promise.resolve(null);
        }
        case "wallet_addEthereumChain": {
          const [parameter] = params as [Record<string, unknown>];
          added.push(parameter);
          moveTo(Number(parameter.chainId));
          return Promise.resolve(null);
        }
        default:
          return Promise.reject(rpcError(4200, `${method} is not supported`));
      }
    },
    on(event: string, listener: Listener) {
      listeners.set(event, (listeners.get(event) ?? new Set()).add(listener));
    },
    removeListener(event: string, listener: Listener) {
      listeners.get(event)?.delete(listener);
    },
  };
  const info = { uuid: "6d1bfc5c-1f43-4b8e-9d7a-2d1f0e0c9a11", name: "Mock Wallet", icon: "data:,", rdns: WALLET_ID };
  const announce = () => {
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }));
  };
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
  return {
    /** Every wallet_addEthereumChain parameter the wallet received. */
    added,
    /** The user switches the wallet's network from the wallet itself. */
    moveTo,
    forget(id: number) {
      known.delete(id);
    },
    /** A wallet that cannot be asked to switch networks. */
    refuseSwitches(refuse: boolean) {
      switches = !refuse;
    },
    lock() {
      accounts = [];
      emit("accountsChanged", accounts);
    },
    unlock() {
      accounts = [ACCOUNT];
      emit("accountsChanged", accounts);
    },
    stop() {
      window.removeEventListener("eip6963:requestProvider", announce);
    },
  };
}

/** What picking the wallet in AppKit's Connect window does (w3m-connecting-external-view). */
export async function connectInAppKit(): Promise<void> {
  const connector = await vi.waitFor(() => {
    const found = ConnectorController.state.connectors.find((c) => c.id === WALLET_ID);
    if (found === undefined) throw new Error("the wallet is not in AppKit's list yet");
    return found;
  }, WAIT);
  await ConnectionController.connectExternal(connector, connector.chain);
  await vi.waitFor(() => {
    expect(accountStatus()).toBe("connected");
  }, WAIT);
}

/** AppKit's Disconnect. */
export async function disconnectInAppKit(): Promise<void> {
  await ConnectionController.disconnect();
  await vi.waitFor(() => {
    expect(accountStatus()).toBe("disconnected");
  }, WAIT);
}

/**
 * A wallet that has `network` takes AppKit there and disconnects, so AppKit keeps that network (and stores it); then a
 * wallet on Ethereum that lacks it is the next to connect. Here both are the same fake, which forgets the network.
 */
export async function leaveAppKitOn(wallet: ReturnType<typeof announceWallet>, chainId: number): Promise<void> {
  wallet.moveTo(chainId);
  await vi.waitFor(() => {
    expect(activeNetwork()).toBe(`eip155:${String(chainId)}`);
  }, WAIT);
  await disconnectInAppKit();
  wallet.moveTo(mainnet.id);
  wallet.forget(chainId);
  // Disconnected, AppKit no longer follows the wallet: it is still on the network the next Connect asks for.
  expect(activeNetwork()).toBe(`eip155:${String(chainId)}`);
}
