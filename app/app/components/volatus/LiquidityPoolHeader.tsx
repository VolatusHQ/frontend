import { Breadcrumb } from "./AppShell";
import { Stat } from "./Stat";
import { poolDisplay, type Market } from "@/app/app/lib/market-data";
import type { ActivityLevel, LpPosition } from "@/app/app/lib/liquidity-data";
import { int, pct } from "@/app/app/lib/format";

/**
 * Establishes the LP's financial context immediately: whose money, how
 * much, what it has earned, and how the pool is behaving. Numbers and short
 * labels only — no explanatory prose. The single home for these figures;
 * nothing lower on the page repeats them.
 */
export function LiquidityPoolHeader({
  market,
  position,
  activity,
}: {
  market: Market;
  position: LpPosition;
  activity: ActivityLevel;
}) {
  const { pool } = market;

  return (
    <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-s5">
      <div className="flex flex-col gap-s3">
        <Breadcrumb
          trail={[{ label: "Liquidity", href: "/app/liquidity" }, { label: poolDisplay(pool) }]}
        />
        <div className="flex flex-col gap-s1">
          <h1 className="font-serif text-d3 font-medium leading-[1.12] tracking-[-0.012em] m-0">
            {poolDisplay(pool)}
          </h1>
          <span className="lbl">
            Liquidity position
            {position.isOwner ? <span className="text-bone-3"> · You created this pool</span> : null}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-x-s5 gap-y-s4">
        <Stat layout="value-first" size="lg" label="Your liquidity" value={`$${int(position.valueUsd)}`} />
        <Stat
          layout="value-first"
          size="lg"
          label="Fees earned"
          ink="realized"
          value={`+$${int(position.feesEarnedUsd)}`}
        />
        <Stat
          layout="value-first"
          size="lg"
          label="Current volatility"
          ink="implied"
          value={pct(market.impliedVol)}
        />
        <Stat layout="value-first" size="lg" label="Pool activity" value={activity} />
      </div>
    </header>
  );
}
