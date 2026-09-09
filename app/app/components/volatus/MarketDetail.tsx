"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Trade } from "@/app/app/lib/candles";
import type { Market } from "@/app/app/lib/market-data";
import { usePositions } from "@/app/app/lib/positions-context";
import { errorMessage } from "@/app/app/lib/onchain/writes";
import { PoolHeader } from "./PoolHeader";
import { TradingChart } from "./TradingChart";
import { TradePanel } from "./TradePanel";
import { PositionsPanel } from "./PositionsPanel";

/**
 * The pool page's client half. Same arrangement as before; the difference is
 * that the figures come from the chain and Buy sends a transaction.
 *
 */
export function MarketDetail({ market, swaps }: { market: Market; swaps: Trade[] }) {
  const { positions, trades, buy, ready } = usePositions();
  const position = positions[market.pool.slug];
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function onBuy(side: "long" | "short", amount: number) {
    if (!ready) {
      setFailed(true);
      setStatus("Connect a wallet first.");
      return;
    }
    setFailed(false);
    setStatus(
      side === "long"
        ? "Buying VAR-LONG in the variance pool…"
        : "Minting a pair and selling the long leg…",
    );
    try {
      await buy(market.pool.slug, side, amount);
      setStatus("Confirmed.");
      router.refresh();
    } catch (e) {
      setFailed(true);
      setStatus(errorMessage(e));
    }
  }

  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <PoolHeader market={market} status="Active" />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] gap-s6 items-start">
        <div className="min-w-0">
          <TradingChart trades={swaps} pool={market.pool} />
        </div>

        <aside className="flex flex-col gap-s5 min-w-0 lg:sticky lg:top-s4">
          <TradePanel market={market} onBuy={onBuy} />
          {status ? (
            <p className={`text-t2 m-0 ${failed ? "text-down" : "text-bone-2"}`}>{status}</p>
          ) : null}
        </aside>
      </div>

      <PositionsPanel slug={market.pool.slug} market={market} position={position} trades={trades} />
    </div>
  );
}
