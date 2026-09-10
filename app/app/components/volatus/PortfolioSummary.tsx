import { Stat } from "./Stat";
import { int } from "@/app/app/lib/format";
import type { PortfolioSummary as Summary } from "@/app/app/lib/portfolio";

/** `+$1,234` / `−$1,234`, the sign carried in the glyph. */
function signedUsd(n: number): string {
  return `${n >= 0 ? "+" : "−"}$${int(Math.abs(n))}`;
}

/**
 * The one figure row for the Profile Overview — capital, then how it splits,
 * then how it is doing. Compact `Stat`s in a wrapping row, not a card each
 * (§10 trait 11). This is the single home for these numbers; the sub-pages
 * do not repeat them.
 */
export function PortfolioSummary({ summary }: { summary: Summary }) {
  return (
    <div className="flex flex-wrap gap-x-s6 gap-y-s4">
      <Stat
        layout="value-first"
        size="lg"
        label="Portfolio value"
        value={`$${int(summary.portfolioValueUsd)}`}
      />
      <Stat
        layout="value-first"
        size="lg"
        label="Total P&L"
        ink={summary.totalPnlUsd < 0 ? "down" : "up"}
        value={signedUsd(summary.totalPnlUsd)}
      />
      <Stat
        layout="value-first"
        size="lg"
        label="LP value"
        value={`$${int(summary.lpValueUsd)}`}
      />
      <Stat
        layout="value-first"
        size="lg"
        label="Trading exposure"
        value={`$${int(summary.tradingExposureUsd)}`}
      />
      <Stat
        layout="value-first"
        size="lg"
        label="Underwriting"
        value={`$${int(summary.underwritingUsd)}`}
      />
    </div>
  );
}
