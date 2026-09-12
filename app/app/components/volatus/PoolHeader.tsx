import { Breadcrumb } from "./AppShell";
import { EpochCountdown } from "./EpochCountdown";
import { Stat } from "./Stat";
import { poolDisplay, type Market } from "@/app/app/lib/market-data";
import { compactUsd, pct, signed } from "@/app/app/lib/format";
import { formatSeverityLabel, type VolSeverity } from "@/app/app/lib/onchain/severity";

/**
 * Breadcrumb, pool name, market label and a one-line status on top; Implied
 * — the one number worth reading at a glance — at hero size below that,
 * with realized/expected/liquidity/volume as smaller secondary reads
 * underneath. This is the single home for these numbers: there is no
 * second stats strip lower on the page repeating any of them.
 */
export function PoolHeader({
  market,
  status,
  severity,
}: {
  market: Market;
  status: "Active" | "Frozen" | "Settled";
  /** Optional/nullable for the Markets detail page's own two states: `null`
   *  means the roller has no severity yet (real, honest "not enough data
   *  yet"); `undefined` falls back to a raw, uninterpreted percentage. The
   *  page's one call site always passes `null` or a real value today. */
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

      <div className="flex flex-col gap-s4">
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

        {/* Secondary reads: everything a trader might still want, at a
         *  deliberately smaller size than Implied (§15.2 — importance comes
         *  from size/position, not colour). Time left is omitted here: the
         *  status line above already carries it, and repeating a hero-sized
         *  countdown twice in one header was pure duplication, not clarity. */}
        <div className="flex flex-wrap gap-x-s6 gap-y-s3">
          <Stat label="Realized" ink="realized" value={pct(market.realizedVol)} />
          <Stat label="Expected" ink="implied" value={pct(market.expectedVol)} />
          <Stat label="Liquidity" value={compactUsd(market.liquidityUsd)} />
          <Stat label="Volume" value={compactUsd(market.volumeUsd)} />
        </div>
      </div>
    </header>
  );
}
