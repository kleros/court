import { vi } from "vitest";

// Test support for the wallet's unit tests only: never imported by app code.

/*
 * WalletConnect's relay, in the test: a test file that pairs imports this module before any other, so that every
 * WebSocket WalletConnect opens is one of these (it takes the WebSocket class when its module loads,
 * @walletconnect/jsonrpc-ws-connection 1.0.16). Each answers every request as the relay does when it accepts it (true)
 * and sends nothing else: enough for WalletConnect to show a pairing address, and no wallet ever answers it. No
 * network: nothing leaves the test.
 */

/** The relay's connections: how many opened, and which are open now. `openAfterMs`: each opens that late. */
export const relay = { openAfterMs: 0, opened: 0, open: new Set<AnsweringSocket>() };

/** WebSocket's ready states. */
const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

class AnsweringSocket {
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: { error: Error }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  readyState = CONNECTING;

  constructor() {
    setTimeout(() => {
      if (this.readyState !== CONNECTING) return;
      this.readyState = OPEN;
      relay.opened += 1;
      relay.open.add(this);
      this.onopen?.();
    }, relay.openAfterMs);
  }

  send(data: string): void {
    if (this.readyState !== OPEN) return;
    const message = JSON.parse(data) as { id: number; method?: string };
    // WalletConnect's acknowledgements of the relay's messages carry no method.
    if (message.method === undefined) return;
    setTimeout(() => this.onmessage?.({ data: JSON.stringify({ id: message.id, jsonrpc: "2.0", result: true }) }), 0);
  }

  close(): void {
    if (this.readyState === CLOSING || this.readyState === CLOSED) return;
    this.readyState = CLOSING;
    relay.open.delete(this);
    setTimeout(() => {
      this.readyState = CLOSED;
      this.onclose?.({ code: 1000, reason: "" });
    }, 0);
  }
}

vi.stubGlobal("WebSocket", AnsweringSocket);
