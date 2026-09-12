"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MOCK_NOW, poolDisplay } from "@/app/app/lib/market-data";
import { agoSeconds, dec, usdc } from "@/app/app/lib/format";
import { cn } from "@/app/app/lib/utils";
import type { TradeHistoryRow } from "@/app/app/lib/portfolio";
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
  { label: "side" },
  { label: "amount" },
  { label: "price" },
  { label: "mark" },
  { label: "time" },
  { label: "p/l" },
] as const;

/**
 * Every fill the wallet has made, newest first. No leverage, funding or
 * liquidation columns — Volatus positions are spot volatility tokens.
 */
export function TradeHistoryTable({ rows }: { rows: TradeHistoryRow[] }) {
  if (rows.length === 0) {
    return <TableEmpty>No trades yet.</TableEmpty>;
  }

  return (
    <Table className="min-w-[820px]">
      <TableColumnHeaders columns={COLUMNS} />
      <TableBody>
        {rows.map((r) => (
          <Row key={r.id} row={r} />
        ))}
      </TableBody>
    </Table>
  );
}

function Row({ row }: { row: TradeHistoryRow }) {
  const router = useRouter();
  const href = `/app/markets/${row.slug}`;
  const sideLabel = row.side === "long" ? "LONG" : "SHORT";
  const tone = row.side === "long" ? "text-up" : "text-down";
  const plTone = row.pnlToDateUsd < 0 ? "text-down" : "text-up";

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
      <TableCell align="right" className={cn("num text-t3 font-medium", tone)}>
        {sideLabel}
      </TableCell>
      <TableCell align="right" className="num text-t3 text-bone-2">
        ${dec(row.usdcAmount, 2)}
      </TableCell>
      <TableCell align="right" className="num text-t3 text-bone-2">
        ${dec(row.price, 2)}
      </TableCell>
      <TableCell align="right" className="num text-t3 text-bone-2">
        ${dec(row.markPrice, 2)}
      </TableCell>
      <TableCell align="right" className="num text-t3 text-bone-2">
        {agoSeconds(row.timestamp, MOCK_NOW)}
      </TableCell>
      <TableCell align="right" className={cn("num text-t3", plTone)}>
        {row.pnlToDateUsd >= 0 ? "+" : "−"}${usdc(Math.abs(row.pnlToDateUsd))}
      </TableCell>
    </TableRow>
  );
}
