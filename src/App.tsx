import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import type { Wallet } from "./wallet";

const queryClient = new QueryClient();

export function App({ wallet }: { readonly wallet: Wallet }) {
  return (
    <WagmiProvider config={wallet.config}>
      <QueryClientProvider client={queryClient}>
        <header className="flex items-center justify-between gap-4 p-4">
          <h1 className="text-xl font-semibold">Kleros Court</h1>
          {wallet.canConnect && <appkit-button />}
        </header>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
