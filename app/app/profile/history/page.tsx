"use client";

import { usePositions } from "../../lib/positions-context";
import { useLiquidity } from "../../lib/liquidity-context";
import { useSponsorship } from "../../lib/sponsorship-context";
import { useMarket } from "../../lib/market-context";
import { buildActivityLedger } from "../../lib/portfolio";
import { ActivityFeed } from "../../components/volatus/ActivityFeed";

export default function ProfileHistoryPage() {
  const { trades } = usePositions();
  const { protection } = useLiquidity();
  const { sponsorships } = useSponsorship();
  const { markets } = useMarket();

  const ledger = buildActivityLedger({ trades, protection, sponsorships, markets });

  return (
    <div className="flex flex-col gap-s4">
      <span className="lbl">Activity</span>
      <ActivityFeed entries={ledger} filterable />
    </div>
  );
}
