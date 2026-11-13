import type { Address } from "viem";
import { isCourtChainId } from "@court/core";
import { CHAIN_BY_ID } from "./chains";

/**
 * AppKit's embedded (custodial) wallet: the connector with id or type `AUTH`. AppKit registers it when email or social
 * login is on, locally or on the Reown dashboard, which overrides local settings (both must stay off). The app
 * never offers it and never counts it as a connection.
 */
export function isEmbeddedWalletConnector(connector: { readonly id: string; readonly type: string }): boolean {
  return connector.id === "AUTH" || connector.type.toUpperCase() === "AUTH";
}

export const EMBEDDED_WALLET_REFUSAL =
  "AppKit registered an embedded-wallet connector; the Reown project settings must turn email and social login off.";

/** What the Connect control needs from AppKit. null in WalletSetup = read-only: nothing can connect. */
export interface WalletModal {
  /** Opens AppKit's Connect view; rejects with EMBEDDED_WALLET_REFUSAL instead when the embedded wallet is registered. */
  openConnect(): Promise<void>;
}

/** The part of wagmi's useAccount() read here. */
export interface WagmiAccount {
  readonly status: "connected" | "connecting" | "reconnecting" | "disconnected";
  readonly address: Address | undefined;
  /** The wallet's chain, which can be one the app does not support (wagmi's config chain is not read). */
  readonly chainId: number | undefined;
  readonly connector: { readonly id: string; readonly type: string } | undefined;
}

export type WalletState =
  | { readonly status: "disconnected" }
  | { readonly status: "connected"; readonly address: Address; readonly chainId: number };

export function walletState({ status, address, chainId, connector }: WagmiAccount): WalletState {
  if (status !== "connected" || address === undefined || chainId === undefined || connector === undefined) {
    return { status: "disconnected" };
  }
  if (isEmbeddedWalletConnector(connector)) return { status: "disconnected" };
  return { status: "connected", address, chainId };
}

export function chainLabel(chainId: number): string {
  const name = isCourtChainId(chainId) ? CHAIN_BY_ID[chainId].name : "Unsupported chain";
  return `${name} (${String(chainId)})`;
}
