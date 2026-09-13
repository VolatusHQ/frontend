"use client";

import Link from "next/link";
import { poolDisplay } from "@/app/app/lib/market-data";
import { useLiquidity } from "@/app/app/lib/liquidity-context";
import { REAL_POOL } from "@/app/app/lib/live-market";
import { usdc } from "@/app/app/lib/format";
import { UniswapMark } from "./UniswapMark";

/**
 * An always-visible entry point to the real pool's liquidity page.
 *
 * `LiquidityPositionsTable` only ever renders a row for a pool the wallet
 * already has a position in, so with none yet there was no link anywhere on
 * this page that led to the one pool this app actually trades — the "Add
 * liquidity" button lives on the detail page, and nothing pointed at it.
 * This sits above that table regardless of position state, matching the
 * pattern the Underwrite page already uses for the same real pool.
 */
export function RealLiquidityCallout() {
  const { positions, protection } = useLiquidity();
  const position = positions[REAL_POOL.slug];
  const isProtected = protection[REAL_POOL.slug] !== undefined;
  const href = `/app/liquidity/${REAL_POOL.slug}`;

  return (
    <Link
      href={href}
      className="flex flex-wrap items-center justify-between gap-s4 border border-hair px-s4 py-s3 no-underline text-bone hover:border-pink transition-colors duration-[140ms]"
    >
      <span className="flex items-center gap-s3 text-t4">
        <UniswapMark />
        {poolDisplay(REAL_POOL)}
        <span className="lbl text-bone-3">real position</span>
      </span>
      <span className="flex items-center gap-s5 text-t3">
        <span className="num text-bone-2">
          {position ? `$${usdc(position.valueUsd)}` : "No position yet"}
        </span>
        <span className="lbl text-bone-3">{isProtected ? "Protected" : "Not protected"}</span>
        <span className="inline-flex items-center gap-s2 border border-hair px-s3 py-[5px] text-t2 hover:border-pink hover:text-pink transition-colors duration-[140ms]">
          {position ? "Manage" : "Add liquidity"}
          <span aria-hidden="true">→</span>
        </span>
      </span>
    </Link>
  );
}
