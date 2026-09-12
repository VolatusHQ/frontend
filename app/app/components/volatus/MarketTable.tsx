"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { poolDisplay, type Market } from "@/app/app/lib/market-data";
import { compactUsd, pct } from "@/app/app/lib/format";
import { formatSeverityLabel, type VolSeverity } from "@/app/app/lib/onchain/severity";
import { Sparkline } from "./Sparkline";
import { EpochCountdown } from "./EpochCountdown";
import { UniswapMark } from "./UniswapMark";
import {
  Table,
  TableBody,
  TableCell,
  TableColumnHeaders,
  TableRow,
} from "@/app/app/components/ui/table";

const COLUMNS = [
  { label: "pool" },
  { label: "volatility" },
  { label: "liquidity" },
  { label: "activity" },
  { label: "epoch" },
  { label: "" },
] as const;

/**
 * The Markets board. A ruled table, not three cards in a row (§10 trait 11).
 * Every row navigates to its pool's detail page.
 */
export function MarketTable({ markets, severity }: { markets: Market[]; severity: VolSeverity | null }) {
  return (
    <Table className="min-w-[720px]">
      <TableColumnHeaders columns={COLUMNS} />
      <TableBody>
        {markets.map((m) => (
          <Row key={m.pool.slug} market={m} severity={severity} />
        ))}
      </TableBody>
    </Table>
  );
}

function Row({ market, severity }: { market: Market; severity: VolSeverity | null }) {
  const router = useRouter();
  const href = `/app/markets/${market.pool.slug}`;

  const hasHistory = market.history.length > 1;

  return (
    <TableRow onClick={() => router.push(href)}>
      <TableCell>
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-s3 text-bone no-underline hover:text-pink transition-colors duration-[140ms] text-t4"
        >
          <UniswapMark />
          {poolDisplay(market.pool)}
        </Link>
      </TableCell>
      <TableCell align="right">
        <div className="flex items-center justify-end gap-s4">
          {/* The sparkline sits ahead of the numbers, never after — it is
              decorative and may reserve no width at all when a pool has no
              history yet, but the numbers must stay anchored under the
              "volatility" header regardless. */}
          {hasHistory ? (
            <Sparkline
              realized={market.history.map((p) => p.realized)}
              implied={market.history.map((p) => p.implied)}
            />
          ) : null}
          <div className="flex flex-col items-end gap-[2px]">
            <span
              className={`num text-t4 ${severity && (severity.tier === "high" || severity.tier === "extreme") ? "text-pink" : "text-bone-2"}`}
            >
              {severity ? formatSeverityLabel(severity) : "not enough data yet"}
            </span>
            <span className="num text-t2 text-yellow">{pct(market.realizedVol)} realized</span>
          </div>
        </div>
      </TableCell>
      <TableCell align="right" className="num text-t3 text-bone-2">
        {compactUsd(market.liquidityUsd)}
      </TableCell>
      <TableCell align="right" className="num text-t3 text-bone-2">
        {compactUsd(market.volumeUsd)}
      </TableCell>
      <TableCell align="right">
        <div className="flex flex-col items-end gap-[2px]">
          <EpochCountdown initialSeconds={market.epoch.remainingSeconds} />
          <span className="lbl">epoch {String(market.epoch.index).padStart(2, "0")}</span>
        </div>
      </TableCell>
      <TableCell align="right">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center gap-s2 min-w-[104px] border border-hair px-s3 py-[5px] text-t2 text-bone no-underline whitespace-nowrap hover:border-pink hover:text-pink transition-colors duration-[140ms]"
        >
          Trade
          <span aria-hidden="true">→</span>
        </Link>
      </TableCell>
    </TableRow>
  );
}
