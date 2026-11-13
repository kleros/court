import { useState } from "react";
import { useAccount } from "wagmi";
import { chainLabel, walletState, type WalletModal } from "./connection";
import { useDisconnectWallets } from "./disconnect";

/**
 * Connect / connected account / Disconnect. Placeholder markup: the design rounds style it. Nothing in read-only mode
 * (no Reown project id), where nothing can connect.
 */
export function WalletControl({ modal }: { readonly modal: WalletModal | null }) {
  const wallet = walletState(useAccount());
  const disconnectWallets = useDisconnectWallets();
  // openConnect waits for Reown's config and wallet list, with no time limit (AppKit ready() and open()).
  const [opening, setOpening] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  if (modal === null) return null;

  if (wallet.status === "connected") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* The wallet's own chain, which may differ from any page's chain (checked again when sending). */}
        <span data-testid="wallet-address" className="font-mono break-all">
          {wallet.address}
        </span>
        <span data-testid="wallet-chain">{chainLabel(wallet.chainId)}</span>
        <button
          type="button"
          onClick={() => {
            disconnectWallets().catch((error: unknown) => {
              console.error("Disconnect failed.", error);
            });
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={opening}
        onClick={() => {
          setOpening(true);
          setUnavailable(false);
          modal
            .openConnect()
            .catch((error: unknown) => {
              console.error("Wallet connection refused.", error);
              setUnavailable(true);
            })
            .finally(() => {
              setOpening(false);
            });
        }}
      >
        {opening ? "Connecting…" : "Connect"}
      </button>
      {unavailable && <p role="alert">Wallet connection is unavailable.</p>}
    </div>
  );
}
