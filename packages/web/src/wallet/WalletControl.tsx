import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { chainLabel, walletState, type WalletModal } from "./connection";

/**
 * Connect / connected account / Disconnect. Placeholder markup: the design rounds style it. Nothing in read-only mode
 * (no Reown project id), where nothing can connect.
 */
export function WalletControl({ modal }: { readonly modal: WalletModal | null }) {
  const wallet = walletState(useAccount());
  // `connectors` = every connected wallet. On load wagmi restores each wallet that already authorised the site; AppKit
  // drops all but one only while Reown's remote multiWallet setting is off (appkit-base-client.js:1103-1121). wagmi's
  // disconnect() with no argument drops only the current one and makes the next one current (@wagmi/core
  // actions/disconnect.ts:54-60): Disconnect would switch accounts instead of disconnecting.
  const { connectors, disconnectAsync } = useDisconnect();
  const disconnectAll = async () => {
    for (const connector of connectors) await disconnectAsync({ connector });
  };
  // openConnect waits for Reown's config and wallet list, with no time limit (AppKit ready() and open()).
  const [opening, setOpening] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  if (modal === null) return null;

  if (wallet.status === "connected") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* The wallet's own chain, which may differ from any page's chain (T27#2 checks it again at send time). */}
        <span data-testid="wallet-address" className="font-mono break-all">
          {wallet.address}
        </span>
        <span data-testid="wallet-chain">{chainLabel(wallet.chainId)}</span>
        <button
          type="button"
          onClick={() => {
            disconnectAll().catch((error: unknown) => {
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
