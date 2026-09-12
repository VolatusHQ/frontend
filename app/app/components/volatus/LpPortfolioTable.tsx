"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { poolDisplay } from "@/app/app/lib/market-data";
import { dec, int, pct } from "@/app/app/lib/format";
import type { LpRow } from "@/app/app/lib/portfolio";
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
  { label: "fees earned" },
  { label: "volatility" },
  { label: "protection" },
  { label: "premium" },
] as const;

/**
 * How the wallet's LP capital has performed and what protection has cost —
 * the complement to /app/liquidity, which is where protection is decided.
 * Every row links back to that pool's Liquidity page.
 */
export function LpPortfolioTable({ rows }: { rows: LpRow[] }) {
  if (rows.length === 0) {
    return <TableEmpty>No liquidity positions.</TableEmpty>;
  }

  return (
    <Table className="min-w-[860px]">
      <TableColumnHeaders columns={COLUMNS} />
      <TableBody>
        {rows.map((r) => (
          <Row key={r.slug} row={r} />
        ))}
      </TableBody>
    </Table>
  );
}

function Row({ row }: { row: LpRow }) {
  const router = useRouter();
  const href = `/app/liquidity/${row.slug}`;
  const isProtected = row.protectedUsd > 0;

  return (
    <TableRow onClick={() => router.push(href)}>
      <TableCell>
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-s3 whitespace-nowrap text-bone no-underline hover:text-pink transition-colors duration-[140ms] text-t4"
        >
          <UniswapMark />
          {poolDisplay(row.pool)}
        </Link>
      </TableCell>
      <TableCell align="right" className="num text-t4 text-bone">
        ${int(row.valueUsd)}
      </TableCell>
      <TableCell align="right" className="num text-t3 text-yellow">
        +${int(row.feesUsd)}
      </TableCell>
      <TableCell align="right">
        <div className="flex flex-col items-end gap-[2px]">
          <span className="num text-t4 text-pink">{pct(row.impliedVol)}</span>
          <span className="num text-t2 text-yellow">{pct(row.realizedVol)} realized</span>
        </div>
      </TableCell>
      <TableCell align="right">
        {isProtected ? (
          <span className="inline-flex items-center gap-s2 num text-t3 text-bone-2">
            <span aria-hidden="true" className="text-violet">
              ●
            </span>
            ${int(row.protectedUsd)}
          </span>
        ) : (
          <span className="lbl text-bone-3">Not protected</span>
        )}
      </TableCell>
      <TableCell align="right" className="num text-t3 text-bone-2">
        {isProtected ? `$${dec(row.premiumPerDayUsd, 2)}/day` : "—"}
      </TableCell>
    </TableRow>
  );
}
