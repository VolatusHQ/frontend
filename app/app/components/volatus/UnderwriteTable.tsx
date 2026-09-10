"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { poolDisplay } from "@/app/app/lib/market-data";
import { compactUsd, pct } from "@/app/app/lib/format";
import { useSponsorship } from "@/app/app/lib/sponsorship-context";
import type { UnderwritePool } from "@/app/app/lib/underwrite-data";
import { UniswapMark } from "./UniswapMark";

const COLS = ["pool", "capacity", "volatility", ""];

/**
 * The Underwrite board — pools ranked by where sponsorship could do the most
 * for liquidity, not by yield. A ruled table, every row navigating to its
 * pool. Mirrors MarketTable, which is wired to /app/markets and so cannot be
 * reused directly.
 */
export function UnderwriteTable({ pools }: { pools: UnderwritePool[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[720px]">
        <thead>
          <tr>
            {COLS.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`lbl pb-s3 font-medium ${i === 0 ? "text-left" : "text-right"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pools.map((p) => (
            <Row key={p.slug} pool={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ pool }: { pool: UnderwritePool }) {
  const router = useRouter();
  const { sponsorships } = useSponsorship();
  const href = `/app/underwrite/${pool.slug}`;
  const sponsoring = Boolean(sponsorships[pool.slug]);

  return (
    <tr
      className="vx-row border-t border-hair-2 cursor-pointer"
      onClick={() => router.push(href)}
    >
      <td className="py-s4 pr-s4">
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
      </td>

      <td className="num text-t3 text-right text-bone-2 py-s4">{compactUsd(pool.liquidityUsd)}</td>

      <td className="num text-t3 text-right text-pink py-s4">{pct(pool.impliedVol)}</td>

      <td className="py-s4 pl-s4 text-right">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center gap-s2 min-w-[104px] border border-hair px-s3 py-[5px] text-t2 text-bone no-underline whitespace-nowrap hover:border-pink hover:text-pink transition-colors duration-[140ms]"
        >
          Underwrite
          <span aria-hidden="true">→</span>
        </Link>
      </td>
    </tr>
  );
}
