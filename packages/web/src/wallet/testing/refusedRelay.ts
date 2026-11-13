import { vi } from "vitest";

// Test support for the wallet's unit tests only: never imported by app code.

/*
 * Unit tests make no network requests: a test file that starts AppKit, which starts WalletConnect on Reown's relay,
 * imports this module before any other, so that every WebSocket the relay connection opens is refused. WalletConnect
 * takes the WebSocket class when its module loads (@walletconnect/jsonrpc-ws-connection 1.0.16), so it must be in place
 * before WalletConnect's modules load.
 */
class RefusedSocket {
  onerror: ((event: { error: Error }) => void) | null = null;
  /** WebSocket.CLOSED */
  readonly readyState = 3;
  constructor() {
    setTimeout(() => this.onerror?.({ error: new Error("unit tests make no network requests") }), 0);
  }
  close = () => undefined;
  send = () => undefined;
}

vi.stubGlobal("WebSocket", RefusedSocket);
