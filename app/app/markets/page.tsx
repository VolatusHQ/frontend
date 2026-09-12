import { PageHead } from "../components/volatus/AppShell";
import { MarketTable } from "../components/volatus/MarketTable";
import { LiveFeedLinks } from "../components/volatus/LiveFeed";
import { getLiveMarket, MEASURED_POOL_ID } from "../lib/live-market";
import { getVolSeverity } from "../lib/vol-history";

/**
 * Re-read the chain every 15s rather than per request. The accumulator only
 * changes on a sampled block, so anything tighter mostly re-fetches an
 * unchanged number; anything looser makes the table stale.
 */
export const revalidate = 15;

export default async function MarketsPage() {
  const [market, severity] = await Promise.all([getLiveMarket(), getVolSeverity(MEASURED_POOL_ID)]);

  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <PageHead
        title="Markets"
        lede="The gap between realized and implied is the trade — pick a pool."
      />

      <div className="flex flex-col gap-s4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-s4 gap-y-s1">
          <span className="lbl">Pools</span>
          <span className="text-t2 text-bone-3">
            Read from the chain. One pool is measured; there is no second one to list.
          </span>
        </div>
        {market ? (
          <MarketTable markets={[market]} severity={severity} />
        ) : (
          <p className="text-t3 text-bone-2 m-0">
            No epoch is open on the measured pool, so there is nothing to trade.
          </p>
        )}
      </div>

      <LiveFeedLinks />
    </div>
  );
}
