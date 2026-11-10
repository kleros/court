import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, type createBrowserRouter } from "react-router";
import { WagmiProvider } from "wagmi";
import type { WalletSetup } from "./wallet/init";

export interface AppProps {
  readonly wallet: WalletSetup;
  readonly router: ReturnType<typeof createBrowserRouter>;
}

const queryClient = new QueryClient();

export function App({ wallet, router }: AppProps) {
  return (
    <WagmiProvider config={wallet.config}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
