"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { poolDisplay } from "@/app/app/lib/market-data";
import { dec, int, pct } from "@/app/app/lib/format";
import type { LpRow } from "@/app/app/lib/portfolio";
import { UniswapMark } from "./UniswapMark";

const HEADS = ["pool", "position value", "fees earned", "volatility", "protection", "premium"];

/**
 * How the wallet's LP capital has performed and what protection has cost —
 * the complement to /app/liquidity, which is where protection is decided.
 * Every row links back to that pool's Liquidity page.
 */
export function LpPortfolioTable({ rows }: { rows: LpRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="ruled pt-s4">
        <p className="text-t4 text-bone-2 m-0">No liquidity positions.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[860px]">
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

function Row({ row }: { row: LpRow }) {
  const router = useRouter();
  const href = `/app/liquidity/${row.slug}`;
  const isProtected = row.protectedUsd > 0;

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
      <td className="num text-t4 text-right text-bone py-s4">${int(row.valueUsd)}</td>
      <td className="num text-t3 text-right text-yellow py-s4">+${int(row.feesUsd)}</td>
      <td className="py-s4 pl-s4 text-right">
        <div className="flex flex-col items-end gap-[2px]">
          <span className="num text-t4 text-pink">{pct(row.impliedVol)}</span>
          <span className="num text-t2 text-yellow">{pct(row.realizedVol)} realized</span>
        </div>
      </td>
      <td className="py-s4 pl-s4 text-right">
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
      </td>
      <td className="num text-t3 text-right text-bone-2 py-s4">
        {isProtected ? `$${dec(row.premiumPerDayUsd, 2)}/day` : "—"}
      </td>
    </tr>
  );
}
