"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi";

/**
 * Plain wagmi wallet connect — an injected EOA wallet only (MetaMask, Rabby,
 * Brave Wallet, ...), via `wagmi.ts`'s `injected()` connector. No
 * email/social login, and no embedded or smart-contract wallet.
 *
 * Nested one level inside the client-component tree in `layout.tsx`, next to
 * the existing Positions/Liquidity/Sponsorship providers.
 */
export function OnchainProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
    </QueryClientProvider>
  );
}
