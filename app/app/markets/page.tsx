import { PageHead } from "../components/volatus/AppShell";
import { MarketTable } from "../components/volatus/MarketTable";
import { LiveFeed, LiveFeedLinks } from "../components/volatus/LiveFeed";
import { getLiveMarket } from "../lib/live-market";
import { readIndex, readStream, readSubscription } from "../lib/onchain/reads";
import { DEMO_SUBSCRIBER_ADDRESS, LIVE_EPOCH_ID } from "../lib/onchain/addresses";

/**
 * Re-read the chain every 15s rather than per request. The accumulator only
 * changes on a sampled block, so anything tighter mostly re-fetches an
 * unchanged number; anything looser makes a "live" panel stale.
 */
export const revalidate = 15;

export default async function MarketsPage() {
  // Every read returns a discriminated result instead of throwing, so an RPC
  // outage degrades the panel rather than taking the route down.
  const [index, stream, subscription, market] = await Promise.all([
    readIndex(),
    readStream(LIVE_EPOCH_ID),
    readSubscription(LIVE_EPOCH_ID, DEMO_SUBSCRIBER_ADDRESS),
    getLiveMarket(),
  ]);

  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <PageHead
        title="Markets"
        lede="The gap between realized and implied is the trade — pick a pool."
      />

      <LiveFeed index={index} stream={stream} subscription={subscription} />

      <div className="flex flex-col gap-s4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-s4 gap-y-s1">
          <span className="lbl">Pools</span>
          <span className="text-t2 text-bone-3">
            Read from the chain. One pool is measured; there is no second one to list.
          </span>
        </div>
        {market ? (
          <MarketTable markets={[market]} />
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
