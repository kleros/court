import { useDisconnect } from "wagmi";

/**
 * Disconnect, as every Disconnect control does it: ends every wallet connection, one after another. On load wagmi
 * restores each wallet that already authorised the site; AppKit drops all but one only while Reown's remote multiWallet
 * setting is off (appkit-base-client.js:1103-1121). wagmi's disconnect with no connector drops only the current one and
 * makes the next one current (@wagmi/core 2.22.1 actions/disconnect.ts:54-60): Disconnect would switch accounts
 * instead. Ends within 5 s, WalletConnect included even when it cannot reach the wallet (endDisconnectLocally,
 * walletConnectRecovery.ts); a browser wallet's part takes at most 0.1 s.
 */
export function useDisconnectWallets(): () => Promise<void> {
  const { connectors, disconnectAsync } = useDisconnect();
  return async () => {
    for (const connector of connectors) await disconnectAsync({ connector }); // NOSONAR
  };
}
