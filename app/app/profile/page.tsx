"use client";

import Link from "next/link";
import { usePositions } from "../lib/positions-context";
import { useMarket } from "../lib/market-context";
import { useLiquidity } from "../lib/liquidity-context";
import { useSponsorship } from "../lib/sponsorship-context";
import { buildActivityLedger, needsAttention, summarize } from "../lib/portfolio";
import { Block, Plate } from "../components/volatus/Stat";
import { PortfolioSummary } from "../components/volatus/PortfolioSummary";
import { PerformanceChart } from "../components/volatus/PerformanceChart";
import { NeedsAttention } from "../components/volatus/NeedsAttention";
import { ActivityFeed } from "../components/volatus/ActivityFeed";

export default function ProfileOverviewPage() {
  const { markets } = useMarket();
  const { positions, trades } = usePositions();
  const { positions: lpPositions, protection } = useLiquidity();
  const { sponsorships } = useSponsorship();

  const summary = summarize({ positions, lpPositions, protection, sponsorships, markets });
  const attention = needsAttention({ lpPositions, protection });
  const ledger = buildActivityLedger({ trades, protection, sponsorships });

  return (
    <>
      <PortfolioSummary summary={summary} />

      <Plate className="p-s4">
        <PerformanceChart total={summary.portfolioValueUsd} />
      </Plate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-s6 items-start">
        <NeedsAttention items={attention} />

        <Block
          title="Recent activity"
          aside={
            <Link
              href="/app/profile/history"
              className="text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms]"
            >
              View all →
            </Link>
          }
        >
          <ActivityFeed entries={ledger} limit={5} />
        </Block>
      </div>
    </>
  );
}
