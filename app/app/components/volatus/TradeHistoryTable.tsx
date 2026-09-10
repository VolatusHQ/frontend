"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MOCK_NOW, poolDisplay } from "@/app/app/lib/market-data";
import { agoSeconds, dec, usdc } from "@/app/app/lib/format";
import { cn } from "@/app/app/lib/utils";
import type { TradeHistoryRow } from "@/app/app/lib/portfolio";
import { UniswapMark } from "./UniswapMark";

const HEADS = ["pool", "side", "amount", "price", "mark", "time", "p/l"];

/**
 * Every fill the wallet has made, newest first. No leverage, funding or
 * liquidation columns — Volatus positions are spot volatility tokens.
 */
export function TradeHistoryTable({ rows }: { rows: TradeHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="ruled pt-s4">
        <p className="text-t4 text-bone-2 m-0">No trades yet.</p>
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
            <Row key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ row }: { row: TradeHistoryRow }) {
  const router = useRouter();
  const href = `/app/markets/${row.slug}`;
  const sideLabel = row.side === "long" ? "LONG" : "SHORT";
  const tone = row.side === "long" ? "text-up" : "text-down";
  const plTone = row.pnlToDateUsd < 0 ? "text-down" : "text-up";

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
      <td className="num text-t3 text-right text-bone-2 py-s4">${dec(row.usdcAmount, 2)}</td>
      <td className="num text-t3 text-right text-bone-2 py-s4">${dec(row.price, 2)}</td>
      <td className="num text-t3 text-right text-bone-2 py-s4">${dec(row.markPrice, 2)}</td>
      <td className="num text-t3 text-right text-bone-2 py-s4">{agoSeconds(row.timestamp, MOCK_NOW)}</td>
      <td className={cn("num text-t3 text-right py-s4", plTone)}>
        {row.pnlToDateUsd >= 0 ? "+" : "−"}${usdc(Math.abs(row.pnlToDateUsd))}
      </td>
    </tr>
  );
}
