import { Breadcrumb } from "./AppShell";
import { Stat } from "./Stat";
import { poolDisplay } from "@/app/app/lib/market-data";
import { compactUsd, pct } from "@/app/app/lib/format";
import type { UnderwritePool } from "@/app/app/lib/underwrite-data";

/**
 * Breadcrumb, pool name and the sponsor's framing on the left; every
 * headline figure for the sponsorship decision — pool liquidity, protected,
 * unprotected, current volatility, volume — in one row on the right. As with
 * PoolHeader, this is the single home for these numbers: the blocks below do
 * not repeat them as a strip.
 */
export function UnderwritePoolHeader({ pool }: { pool: UnderwritePool }) {
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
          label="Pool liquidity"
          value={compactUsd(pool.liquidityUsd)}
        />
        <Stat
          layout="value-first"
          size="lg"
          label="Protected"
          value={compactUsd(pool.protectedUsd)}
          sub={`${pct(pool.protectedShare)} of pool`}
        />
        <Stat
          layout="value-first"
          size="lg"
          label="Unprotected"
          value={compactUsd(pool.unprotectedUsd)}
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
