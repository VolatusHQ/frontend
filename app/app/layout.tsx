import type { Metadata } from "next";
import "./app.css";
import { OnchainProviders } from "./lib/onchain/providers";
import { MarketProvider } from "./lib/market-context";
import { EpochLegsProvider, PositionsProvider } from "./lib/positions-context";
import { LiquidityProvider } from "./lib/liquidity-context";
import { SponsorshipProvider } from "./lib/sponsorship-context";
import { TooltipProvider } from "./components/ui/tooltip";
import { AppShell } from "./components/volatus/AppShell";
import { getEpochLegs, getLiveMarket } from "./lib/live-market";

export const metadata: Metadata = {
  title: "Volatus — the volatility index",
  description:
    "Realized variance measured inside a Uniswap v4 pool, and the market where that volatility trades.",
};

/**
 * The application shell. DESIGN.md §15.
 *
 * `app.css` is imported here and nowhere else — the landing page at / is
 * styled entirely by globals.css and the two share no components.
 *
 * The market and the epoch's legs are read once here, on the server, and
 * handed to every screen.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [market, legs] = await Promise.all([getLiveMarket(), getEpochLegs()]);

  return (
    <OnchainProviders>
      <MarketProvider market={market}>
        <EpochLegsProvider legs={legs}>
          <PositionsProvider>
            <LiquidityProvider>
              <SponsorshipProvider>
                <TooltipProvider delayDuration={120}>
                  <div className="vx">
                    <AppShell>{children}</AppShell>
                  </div>
                </TooltipProvider>
              </SponsorshipProvider>
            </LiquidityProvider>
          </PositionsProvider>
        </EpochLegsProvider>
      </MarketProvider>
    </OnchainProviders>
  );
}
