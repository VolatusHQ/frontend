"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { poolDisplay } from "@/app/app/lib/market-data";
import { dec, int, usdc } from "@/app/app/lib/format";
import { cn } from "@/app/app/lib/utils";
import type { OpenTradeRow } from "@/app/app/lib/portfolio";
import { UniswapMark } from "./UniswapMark";

const HEADS = ["pool", "side", "size", "price", "value"];

/**
 * Open volatility positions. Not a Markets board — this is where the wallet
 * reads its existing exposure. Every row navigates back to that market,
 * where the position can actually be changed.
 */
export function ProfilePositionsTable({ rows }: { rows: OpenTradeRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="ruled pt-s4">
        <p className="text-t4 text-bone-2 m-0">No open positions. Trade volatility from Markets.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[820px]">
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

function Row({ row }: { row: OpenTradeRow }) {
  const router = useRouter();
  const href = `/app/markets/${row.slug}`;
  const sideLabel = row.side === "long" ? "LONG" : "SHORT";
  const tone = row.side === "long" ? "text-up" : "text-down";

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
      <td className={cn("num text-t3 text-right py-s4 font-medium", tone)}>{sideLabel}</td>
      <td className="num text-t3 text-right text-bone-2 py-s4">{int(row.size)}</td>
      <td className="num text-t3 text-right text-bone-2 py-s4">${dec(row.currentPrice, 2)}</td>
      <td className="num text-t4 text-right text-bone py-s4">${usdc(row.valueUsd)}</td>
    </tr>
  );
}
