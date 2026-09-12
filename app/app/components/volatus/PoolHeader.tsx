import { Breadcrumb } from "./AppShell";
import { EpochCountdown } from "./EpochCountdown";
import { Stat } from "./Stat";
import { poolDisplay, type Market } from "@/app/app/lib/market-data";
import { compactUsd, pct, signed } from "@/app/app/lib/format";
import { formatSeverityLabel, type VolSeverity } from "@/app/app/lib/onchain/severity";

/**
 * Breadcrumb, pool name, market label and a one-line status on top; every
 * headline figure for this market — implied, realized, expected, liquidity,
 * volume, time left — in one full-width row below, at "hero" size. This is
 * the single home for these numbers: there is no second stats strip lower
 * on the page repeating any of them.
 *
 * Stacked rather than split side-by-side with the title: six numbers big
 * enough to read at a glance need more width than half the header has to
 * give while sharing a row with "ETH / USDC" — splitting them squeezed the
 * numbers down or wrapped the row. Stacking gives them the full container
 * width instead.
 */
export function PoolHeader({
  market,
  status,
  severity,
}: {
  market: Market;
  status: "Active" | "Frozen" | "Settled";
  /** Undefined (not just null) on purpose: this header is shared with the
   *  still-mock Liquidity page, which has no real severity to show and
   *  simply omits the prop rather than passing a fabricated one. */
  severity?: VolSeverity | null;
}) {
  const { pool, epoch } = market;

  return (
    <header className="flex flex-col gap-s5">
      <div className="flex flex-col gap-s3">
        <Breadcrumb trail={[{ label: "Markets", href: "/app/markets" }, { label: poolDisplay(pool) }]} />
        <div className="flex flex-col gap-s1">
          <h1 className="font-serif text-d3 font-medium leading-[1.12] tracking-[-0.012em] m-0">
            {poolDisplay(pool)}
          </h1>
          <span className="lbl">Volatility Market</span>
        </div>
        <div className="text-t3 text-bone-2 flex items-center gap-s2">
          <span className="text-bone">{status}</span>
          <span aria-hidden="true" className="opacity-40">
            ·
          </span>
          <span>Epoch {String(epoch.index).padStart(2, "0")}</span>
          <span aria-hidden="true" className="opacity-40">
            ·
          </span>
          <span className="flex items-center gap-[4px]">
            <EpochCountdown initialSeconds={epoch.remainingSeconds} />
            <span>remaining</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-x-s6 gap-y-s4">
        <Stat
          layout="value-first"
          size="hero"
          label="Implied"
          ink={severity && (severity.tier === "high" || severity.tier === "extreme") ? "warn" : "implied"}
          value={
            severity !== undefined ? (
              severity ? (
                formatSeverityLabel(severity)
              ) : (
                "not enough data yet"
              )
            ) : (
              <>
                {pct(market.impliedVol)}{" "}
                <span className="text-t3 text-bone-2">{signed(market.impliedVolChangePp)}%</span>
              </>
            )
          }
          sub={severity ? `${pct(market.impliedVol)} annualized` : undefined}
        />
        <Stat layout="value-first" size="hero" label="Realized" ink="realized" value={pct(market.realizedVol)} />
        <Stat layout="value-first" size="hero" label="Expected" ink="implied" value={pct(market.expectedVol)} />
        <Stat layout="value-first" size="hero" label="Liquidity" value={compactUsd(market.liquidityUsd)} />
        <Stat layout="value-first" size="hero" label="Volume" value={compactUsd(market.volumeUsd)} />
        <Stat
          layout="value-first"
          size="hero"
          label="Time left"
          value={<EpochCountdown initialSeconds={epoch.remainingSeconds} />}
        />
      </div>
    </header>
  );
}
