"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MARKETS, poolDisplay, type PoolSlug } from "@/app/app/lib/market-data";
import { useLiquidity } from "@/app/app/lib/liquidity-context";
import type { LpPosition } from "@/app/app/lib/liquidity-data";
import { int, pct } from "@/app/app/lib/format";
import { UniswapMark } from "./UniswapMark";

const HEADERS = ["pool", "position value", "volatility", "protection", ""];

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
    return (
      <div className="ruled pt-s4">
        <p className="text-t4 text-bone-2 m-0">No liquidity positions found for this wallet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[820px]">
        <thead>
          <tr>
            {HEADERS.map((h, i) => (
              <th
                key={h || "action"}
                scope="col"
                className={`lbl pb-s3 font-medium ${i === 0 ? "text-left" : "text-right"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <Row key={p.slug} slug={p.slug} valueUsd={p.valueUsd} />
          ))}
        </tbody>
      </table>
    </div>
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
    <tr className="vx-row border-t border-hair-2 cursor-pointer" onClick={() => router.push(href)}>
      <td className="py-s4 pr-s4">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-s3 text-bone no-underline hover:text-pink transition-colors duration-[140ms] text-t4"
        >
          <UniswapMark />
          {poolDisplay(market.pool)}
        </Link>
      </td>
      <td className="num text-t4 text-right text-bone py-s4">${int(valueUsd)}</td>
      <td className="py-s4 pl-s4 text-right">
        <div className="flex flex-col items-end gap-[2px]">
          <span className="num text-t4 text-pink">{pct(market.impliedVol)}</span>
          <span className="num text-t2 text-yellow">{pct(market.realizedVol)} realized</span>
        </div>
      </td>
      <td className="py-s4 pl-s4 text-right">
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
      </td>
      <td className="py-s4 pl-s4 text-right">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center gap-s2 min-w-[104px] border border-hair px-s3 py-[5px] text-t2 text-bone no-underline whitespace-nowrap hover:border-pink hover:text-pink transition-colors duration-[140ms]"
        >
          {isProtected ? "Manage" : "Protect"}
          <span aria-hidden="true">→</span>
        </Link>
      </td>
    </tr>
  );
}
