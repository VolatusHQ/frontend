"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { poolDisplay } from "@/app/app/lib/market-data";
import { compactUsd, pct } from "@/app/app/lib/format";
import { useSponsorship } from "@/app/app/lib/sponsorship-context";
import type { LiveUnderwritePool } from "@/app/app/lib/live-market";
import { UniswapMark } from "./UniswapMark";
import {
  Table,
  TableBody,
  TableCell,
  TableColumnHeaders,
  TableRow,
} from "@/app/app/components/ui/table";

const COLUMNS = [{ label: "pool" }, { label: "capacity" }, { label: "volatility" }, { label: "" }] as const;

/**
 * The Underwrite board — pools ranked by where sponsorship could do the most
 * for liquidity, not by yield. A ruled table, every row navigating to its
 * pool. Mirrors MarketTable, which is wired to /app/markets and so cannot be
 * reused directly.
 */
export function UnderwriteTable({ pools }: { pools: LiveUnderwritePool[] }) {
  return (
    <Table className="min-w-[720px]">
      <TableColumnHeaders columns={COLUMNS} />
      <TableBody>
        {pools.map((p) => (
          <Row key={p.slug} pool={p} />
        ))}
      </TableBody>
    </Table>
  );
}

function Row({ pool }: { pool: LiveUnderwritePool }) {
  const router = useRouter();
  const { sponsorships } = useSponsorship();
  const href = `/app/underwrite/${pool.slug}`;
  const sponsoring = Boolean(sponsorships[pool.slug]);

  return (
    <TableRow onClick={() => router.push(href)}>
      <TableCell>
        <div className="flex flex-col gap-[2px]">
          <Link
            href={href}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-s3 text-bone no-underline hover:text-pink transition-colors duration-[140ms] text-t4"
          >
            <UniswapMark />
            {poolDisplay(pool.pool)}
          </Link>
          {sponsoring ? <span className="lbl text-pink">Sponsoring</span> : null}
        </div>
      </TableCell>

      <TableCell align="right" className="num text-t3 text-bone-2">
        {compactUsd(pool.capacityUsd)}
      </TableCell>

      <TableCell align="right" className="num text-t3 text-pink">
        {pct(pool.impliedVol)}
      </TableCell>

      <TableCell align="right">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center gap-s2 min-w-[104px] border border-hair px-s3 py-[5px] text-t2 text-bone no-underline whitespace-nowrap hover:border-pink hover:text-pink transition-colors duration-[140ms]"
        >
          Underwrite
          <span aria-hidden="true">→</span>
        </Link>
      </TableCell>
    </TableRow>
  );
}
