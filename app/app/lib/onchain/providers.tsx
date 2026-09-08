"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { arcTestnet, unichainSepolia } from "./chains";
import { PRIVY_APP_ID } from "./privy-config";
import { wagmiConfig } from "./wagmi";

/**
 * Privy is the sign-in surface named in README.md's LP flow and env vars
 * (`NEXT_PUBLIC_PRIVY_APP_ID`); `@privy-io/wagmi` bridges whichever wallet it
 * connects (embedded or external) into the same wagmi config every write
 * hook in the app uses, so a component never has to know which path a given
 * user signed in through.
 *
 * Nested one level inside the client-component tree in `layout.tsx`, next to
 * the existing Positions/Liquidity/Sponsorship providers.
 */
export function OnchainProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const appId = PRIVY_APP_ID;

  if (!appId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "NEXT_PUBLIC_PRIVY_APP_ID is not set — wallet connect is disabled. " +
          "Create an app at https://dashboard.privy.io and add it to apps/web/.env.local.",
      );
    }
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: { walletChainType: "ethereum-only" },
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet, unichainSepolia],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={wagmiConfig}>{children}</PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
