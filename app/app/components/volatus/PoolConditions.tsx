import { Block, Stat } from "./Stat";
import { pct } from "@/app/app/lib/format";
import type { Market } from "@/app/app/lib/market-data";

/**
 * Contextualises the headline volatility number rather than just restating
 * it: what the pool actually did (realized) beside what the market expects
 * (implied). Compact — this is the environment the LP's liquidity sits in,
 * not the main event.
 */
export function PoolConditions({ market }: { market: Market }) {
  return (
    <Block title="Volatility">
      <div className="flex flex-wrap gap-x-s7 gap-y-s4">
        <Stat layout="value-first" size="lg" label="Current" ink="implied" value={pct(market.impliedVol)} />
        <Stat layout="value-first" label="Realized" ink="realized" value={pct(market.realizedVol)} />
        <Stat layout="value-first" label="Implied" ink="implied" value={pct(market.impliedVol)} />
      </div>
    </Block>
  );
}
