"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { poolDisplay } from "@/app/app/lib/market-data";
import { int } from "@/app/app/lib/format";
import type { SponsorshipRow } from "@/app/app/lib/portfolio";
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
  { label: "capital committed" },
  { label: "liquidity supported" },
  { label: "impact" },
  { label: "status" },
] as const;

/**
 * The wallet's sponsorships. "Liquidity supported" leads, not a yield — the
 * point of underwriting is deeper LP liquidity, and the figure is an
 * estimate, never a promise. Rows link back to the pool's Underwrite page.
 */
export function SponsorshipPortfolioTable({ rows }: { rows: SponsorshipRow[] }) {
  if (rows.length === 0) {
    return <TableEmpty>No sponsorships. Fund protection for a pool from Underwrite.</TableEmpty>;
  }

  return (
    <Table className="min-w-[720px]">
      <TableColumnHeaders columns={COLUMNS} />
      <TableBody>
        {rows.map((r) => (
          <Row key={r.slug} row={r} />
        ))}
      </TableBody>
    </Table>
  );
}

function Row({ row }: { row: SponsorshipRow }) {
  const router = useRouter();
  const href = `/app/underwrite/${row.slug}`;

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
        ${int(row.capitalUsd)}
      </TableCell>
      <TableCell align="right" className="num text-t3 text-bone-2">
        ~${int(row.supportedUsd)}
      </TableCell>
      <TableCell align="right" className="num text-t3 text-bone-2">
        {row.impactMultiple}×
      </TableCell>
      <TableCell align="right">
        <span className="inline-flex items-center gap-s2 lbl text-bone-2">
          <span aria-hidden="true" className="text-violet">
            ●
          </span>
          {row.status}
        </span>
      </TableCell>
    </TableRow>
  );
}
