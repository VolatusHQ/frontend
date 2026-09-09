import { Block, Stat } from "./Stat";
import { pct } from "@/app/app/lib/format";
import { longShare, marketLeaning } from "@/app/app/lib/liquidity-data";
import type { Market } from "@/app/app/lib/market-data";

/**
 * What other participants are currently betting on volatility. The LP is
 * not necessarily trading this market — they are reading the environment
 * their liquidity is exposed to. Compact split bar + the one-line takeaway,
 * not a trading terminal. Colour stays structural (violet on the bar),
 * never up/down.
 */
export function MarketPositioning({ market }: { market: Market }) {
  const long = longShare(market);
  const short = 1 - long;

  return (
    <Block title="Volatility market">
      <div className="flex flex-col gap-s3">
        <div className="flex h-[10px] w-full overflow-hidden border border-hair" aria-hidden="true">
          <div style={{ width: `${long * 100}%` }} className="bg-violet/40" />
          <div style={{ width: `${short * 100}%` }} className="bg-hair" />
        </div>

        <div className="flex items-start justify-between gap-s4">
          <Stat layout="value-first" label="Long" value={pct(long, 0)} />
          <Stat
            layout="value-first"
            label="Short"
            value={pct(short, 0)}
            className="items-end text-right"
          />
        </div>

        <div className="ruled pt-s3 flex items-baseline justify-between gap-s4">
          <span className="lbl">Market leaning</span>
          <span className="num text-t4 text-bone">{marketLeaning(market)}</span>
        </div>
      </div>
    </Block>
  );
}
