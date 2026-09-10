"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { poolDisplay } from "@/app/app/lib/market-data";
import { int } from "@/app/app/lib/format";
import type { SponsorshipRow } from "@/app/app/lib/portfolio";
import { UniswapMark } from "./UniswapMark";

const HEADS = ["pool", "capital committed", "liquidity supported", "impact", "status"];

/**
 * The wallet's sponsorships. "Liquidity supported" leads, not a yield — the
 * point of underwriting is deeper LP liquidity, and the figure is an
 * estimate, never a promise. Rows link back to the pool's Underwrite page.
 */
export function SponsorshipPortfolioTable({ rows }: { rows: SponsorshipRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="ruled pt-s4">
        <p className="text-t4 text-bone-2 m-0">
          No sponsorships. Fund protection for a pool from Underwrite.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[720px]">
        <thead>
          <tr>
            {HEADS.map((h, i) => (
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
          {rows.map((r) => (
            <Row key={r.slug} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ row }: { row: SponsorshipRow }) {
  const router = useRouter();
  const href = `/app/underwrite/${row.slug}`;

  return (
    <tr className="vx-row border-t border-hair-2 cursor-pointer" onClick={() => router.push(href)}>
      <td className="py-s4 pr-s4">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-s3 whitespace-nowrap text-bone no-underline hover:text-pink transition-colors duration-[140ms] text-t4"
        >
          <UniswapMark />
          {poolDisplay(row.pool)}
        </Link>
      </td>
      <td className="num text-t4 text-right text-bone py-s4">${int(row.capitalUsd)}</td>
      <td className="num text-t3 text-right text-bone-2 py-s4">~${int(row.supportedUsd)}</td>
      <td className="num text-t3 text-right text-bone-2 py-s4">{row.impactMultiple}×</td>
      <td className="py-s4 pl-s4 text-right">
        <span className="inline-flex items-center gap-s2 lbl text-bone-2">
          <span aria-hidden="true" className="text-violet">
            ●
          </span>
          {row.status}
        </span>
      </td>
    </tr>
  );
}
