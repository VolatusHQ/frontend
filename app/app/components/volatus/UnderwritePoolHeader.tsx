import { Breadcrumb } from "./AppShell";
import { Stat } from "./Stat";
import { poolDisplay } from "@/app/app/lib/market-data";
import { compactUsd, pct } from "@/app/app/lib/format";
import type { LiveUnderwritePool } from "@/app/app/lib/live-market";

/**
 * Breadcrumb, pool name and the sponsor's framing on the left; every
 * headline figure for the sponsorship decision — capacity posted, protected,
 * unprotected, current volatility, volume — in one row on the right. As with
 * PoolHeader, this is the single home for these numbers: the blocks below do
 * not repeat them as a strip.
 *
 * "Protected"/"Unprotected" render "not modeled" when `null` — the
 * underlying mWETH/mUSDC pool has no real dollar price to split, so there is
 * no honest number here, not just a zero one. See `live-market.ts`.
 */
export function UnderwritePoolHeader({ pool }: { pool: LiveUnderwritePool }) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-s5">
      <div className="flex flex-col gap-s3">
        <Breadcrumb
          trail={[
            { label: "Underwrite", href: "/app/underwrite" },
            { label: poolDisplay(pool.pool) },
          ]}
        />
        <div className="flex flex-col gap-s1">
          <h1 className="font-serif text-d3 font-medium leading-[1.12] tracking-[-0.012em] m-0">
            {poolDisplay(pool.pool)}
          </h1>
          <span className="lbl">Liquidity sponsorship</span>
        </div>
        <p className="text-t3 text-bone-3 m-0 max-w-[46ch]">
          For token teams, treasuries and ecosystem sponsors funding protection so LPs stay in
          this pool.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-x-s5 gap-y-s4">
        <Stat
          layout="value-first"
          size="lg"
          label="Capacity posted"
          value={compactUsd(pool.capacityUsd)}
        />
        <Stat
          layout="value-first"
          size="lg"
          label="Protected"
          value={pool.protectedUsd === null ? "not modeled" : compactUsd(pool.protectedUsd)}
          sub={pool.protectedShare === null ? undefined : `${pct(pool.protectedShare)} of pool`}
        />
        <Stat
          layout="value-first"
          size="lg"
          label="Unprotected"
          value={pool.unprotectedUsd === null ? "not modeled" : compactUsd(pool.unprotectedUsd)}
        />
        <Stat
          layout="value-first"
          size="lg"
          label="Current volatility"
          ink="implied"
          value={pct(pool.impliedVol)}
        />
        <Stat
          layout="value-first"
          size="lg"
          label="Volume"
          value={compactUsd(pool.volumeUsd)}
        />
      </div>
    </header>
  );
}
