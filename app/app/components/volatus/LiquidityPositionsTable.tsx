"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MARKETS, poolDisplay, type PoolSlug } from "@/app/app/lib/market-data";
import { useLiquidity } from "@/app/app/lib/liquidity-context";
import type { LpPosition } from "@/app/app/lib/liquidity-data";
import { int, pct } from "@/app/app/lib/format";
import { UniswapMark } from "./UniswapMark";
import {
  Table,
  TableBody,
  TableCell,
  TableColumnHeaders,
  TableEmpty,
  TableRow,
} from "@/app/app/components/ui/table";

const COLUMNS = [
  { label: "pool" },
  { label: "position value" },
  { label: "volatility" },
  { label: "protection" },
  { label: "" },
] as const;

/**
 * The LP's portfolio of existing Uniswap liquidity — a ruled table, same
 * treatment as the Markets board, not a wall of cards. Every row navigates
 * to that pool's Liquidity page; each also carries an explicit action
 * (Protect / Manage) so it is obvious what the page is for.
 */
export function LiquidityPositionsTable() {
  const { positions } = useLiquidity();
  const rows = Object.values(positions).filter((p): p is LpPosition => p !== undefined);

  if (rows.length === 0) {
    return <TableEmpty>No liquidity positions found for this wallet.</TableEmpty>;
  }

  return (
    <Table className="min-w-[820px]">
      <TableColumnHeaders columns={COLUMNS} />
      <TableBody>
        {rows.map((p) => (
          <Row key={p.slug} slug={p.slug} valueUsd={p.valueUsd} />
        ))}
      </TableBody>
    </Table>
  );
}

function Row({
  slug,
  valueUsd,
}: {
  slug: PoolSlug;
  valueUsd: number;
}) {
  const router = useRouter();
  const { protection } = useLiquidity();
  const market = MARKETS[slug];
  const href = `/app/liquidity/${slug}`;
  const isProtected = protection[slug] !== undefined;

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
      <TableCell align="right" className="num text-t4 text-bone">
        ${int(valueUsd)}
      </TableCell>
      <TableCell align="right">
        <div className="flex flex-col items-end gap-[2px]">
          <span className="num text-t4 text-pink">{pct(market.impliedVol)}</span>
          <span className="num text-t2 text-yellow">{pct(market.realizedVol)} realized</span>
        </div>
      </TableCell>
      <TableCell align="right">
        {isProtected ? (
          <span className="inline-flex items-center gap-s2 lbl text-bone-2">
            <span aria-hidden="true" className="text-violet">
              ●
            </span>
            Active
          </span>
        ) : (
          <span className="lbl text-bone-3">Not protected</span>
        )}
      </TableCell>
      <TableCell align="right">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center gap-s2 min-w-[104px] border border-hair px-s3 py-[5px] text-t2 text-bone no-underline whitespace-nowrap hover:border-pink hover:text-pink transition-colors duration-[140ms]"
        >
          {isProtected ? "Manage" : "Protect"}
          <span aria-hidden="true">→</span>
        </Link>
      </TableCell>
    </TableRow>
  );
}
