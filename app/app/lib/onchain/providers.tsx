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
/**
 * Every chain read this app makes through React Query — positions, wallet
 * trades, LP positions, protection, sponsorship, the roller feed — is either
 * an `eth_getLogs` scan (which multicall batching cannot help; each is a real
 * HTTP round trip) or a set of `eth_call`s. React Query's own defaults
 * (`staleTime: 0`, refetch on every window focus and remount) treat those the
 * same as a cheap local read, so navigating between pages or tabbing back in
 * re-ran the full scan every time — the actual request-volume multiplier
 * that overwhelmed the RPC, on top of anything the RPC layer itself does.
 * One query per address per scan per session is enough; `buy`/`redeem`
 * already call `.refetch()` explicitly the moment something they did could
 * have changed the answer.
 */
const QUERY_DEFAULTS = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
  retry: false,
} as const;

export function OnchainProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: QUERY_DEFAULTS } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
    </QueryClientProvider>
  );
}
