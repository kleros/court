import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, type createBrowserRouter } from "react-router";
import { WagmiProvider } from "wagmi";
import type { WalletSetup } from "./wallet/init";
import { WalletControl } from "./wallet/WalletControl";

export interface AppProps {
  readonly wallet: WalletSetup;
  readonly router: ReturnType<typeof createBrowserRouter>;
}

const queryClient = new QueryClient();

export function App({ wallet, router }: AppProps) {
  return (
    <WagmiProvider config={wallet.config}>
      <QueryClientProvider client={queryClient}>
        <header className="flex justify-end p-4">
          <WalletControl modal={wallet.modal} />
        </header>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
