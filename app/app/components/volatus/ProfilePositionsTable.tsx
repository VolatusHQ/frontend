"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { poolDisplay } from "@/app/app/lib/market-data";
import { dec, int, usdc } from "@/app/app/lib/format";
import { cn } from "@/app/app/lib/utils";
import type { OpenTradeRow } from "@/app/app/lib/portfolio";
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
  { label: "size" },
  { label: "price" },
  { label: "value" },
] as const;

/**
 * Open volatility positions. Not a Markets board — this is where the wallet
 * reads its existing exposure. Every row navigates back to that market,
 * where the position can actually be changed.
 */
export function ProfilePositionsTable({ rows }: { rows: OpenTradeRow[] }) {
  if (rows.length === 0) {
    return <TableEmpty>No open positions. Trade volatility from Markets.</TableEmpty>;
  }

  return (
    <Table className="min-w-[820px]">
      <TableColumnHeaders columns={COLUMNS} />
      <TableBody>
        {rows.map((r) => (
          <Row key={r.slug} row={r} />
        ))}
      </TableBody>
    </Table>
  );
}

function Row({ row }: { row: OpenTradeRow }) {
  const router = useRouter();
  const href = `/app/markets/${row.slug}`;
  const sideLabel = row.side === "long" ? "LONG" : "SHORT";
  const tone = row.side === "long" ? "text-up" : "text-down";

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
        {int(row.size)}
      </TableCell>
      <TableCell align="right" className="num text-t3 text-bone-2">
        ${dec(row.currentPrice, 2)}
      </TableCell>
      <TableCell align="right" className="num text-t4 text-bone">
        ${usdc(row.valueUsd)}
      </TableCell>
    </TableRow>
  );
}
