"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { poolDisplay, type Market } from "@/app/app/lib/market-data";
import { compactUsd, pct } from "@/app/app/lib/format";
import { Sparkline } from "./Sparkline";
import { EpochCountdown } from "./EpochCountdown";
import { UniswapMark } from "./UniswapMark";

/**
 * The Markets board. A ruled table, not three cards in a row (§10 trait 11).
 * Every row navigates to its pool's detail page.
 */
export function MarketTable({ markets }: { markets: Market[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[720px]">
        <thead>
          <tr>
            {["pool", "volatility", "liquidity", "activity", "epoch", ""].map((h, i) => (
              <th
                key={h || i}
                scope="col"
                className={`lbl pb-s3 font-medium ${i === 0 ? "text-left" : "text-right"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => (
            <Row key={m.pool.slug} market={m} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ market }: { market: Market }) {
  const router = useRouter();
  const href = `/app/markets/${market.pool.slug}`;

  return (
    <tr
      className="vx-row border-t border-hair-2 cursor-pointer"
      onClick={() => router.push(href)}
    >
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
      <td className="py-s4 pl-s4 text-right">
        <div className="flex items-center justify-end gap-s4">
          <div className="flex flex-col items-end gap-[2px]">
            <span className="num text-t4 text-pink">{pct(market.impliedVol)}</span>
            <span className="num text-t2 text-yellow">{pct(market.realizedVol)} realized</span>
          </div>
          <Sparkline
            realized={market.history.map((p) => p.realized)}
            implied={market.history.map((p) => p.implied)}
          />
        </div>
      </td>
      <td className="num text-t3 text-right text-bone-2 py-s4">{compactUsd(market.liquidityUsd)}</td>
      <td className="num text-t3 text-right text-bone-2 py-s4">{compactUsd(market.volumeUsd)}</td>
      <td className="py-s4 pl-s4 text-right">
        <div className="flex flex-col items-end gap-[2px]">
          <EpochCountdown initialSeconds={market.epoch.remainingSeconds} />
          <span className="lbl">epoch {String(market.epoch.index).padStart(2, "0")}</span>
        </div>
      </td>
      <td className="py-s4 pl-s4 text-right">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center gap-s2 min-w-[104px] border border-hair px-s3 py-[5px] text-t2 text-bone no-underline whitespace-nowrap hover:border-pink hover:text-pink transition-colors duration-[140ms]"
        >
          Trade
          <span aria-hidden="true">→</span>
        </Link>
      </td>
    </tr>
  );
}
