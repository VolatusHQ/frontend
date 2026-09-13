"use client";

import { useState } from "react";
import type { Market } from "@/app/app/lib/market-data";
import type { Side } from "@/app/app/lib/positions-context";
import { estimateTokens } from "@/app/app/lib/trade";
import { dec, int } from "@/app/app/lib/format";
import { useAmountInput } from "@/app/app/lib/useAmountInput";
import { cn } from "@/app/app/lib/utils";

/**
 * A single switchable panel, not two stacked blocks. The Long/Short
 * switcher sits on top; everything below it — price, direction, amount,
 * estimate, button — describes whichever side is selected. Long is green,
 * short is red: the standard trading convention, used only here and on the
 * chart's candles (app.css's --up/--down — see the note there on why this
 * breaks the rest of the system's "no red, no green" rule on purpose).
 */
export function TradePanel({
  market,
  onBuy,
  busy,
}: {
  market: Market;
  onBuy: (side: Side, usdcAmount: number) => void;
  /** True while a Buy or Redeem is already in flight — disables the button
   *  so a second click can't fire an overlapping approve + swap sequence
   *  against the same wallet (see MarketDetail's onBuy/onRedeem doc). */
  busy: boolean;
}) {
  const [side, setSide] = useState<Side>("long");
  const { raw, setRaw, amount } = useAmountInput(100);

  const isLong = side === "long";
  const price = isLong ? market.longPrice : market.shortPrice;
  const estimate = estimateTokens(amount, price);
  const label = isLong ? "LONG" : "SHORT";
  const tone = isLong ? "text-up" : "text-down";

  return (
    <div className="flex flex-col gap-s4">
      <div className="grid grid-cols-2">
        <button
          type="button"
          onClick={() => setSide("long")}
          aria-pressed={isLong}
          className={cn(
            "py-s3 text-t3 text-center font-medium border transition-colors duration-[140ms]",
            isLong
              ? "bg-up/15 border-up text-up"
              : "border-hair text-bone-2 hover:text-bone",
          )}
        >
          Long
        </button>
        <button
          type="button"
          onClick={() => setSide("short")}
          aria-pressed={!isLong}
          className={cn(
            "py-s3 text-t3 text-center font-medium border border-l-0 transition-colors duration-[140ms]",
            !isLong
              ? "bg-down/15 border-down text-down"
              : "border-hair text-bone-2 hover:text-bone",
          )}
        >
          Short
        </button>
      </div>

      <div className="ruled pt-s4 flex flex-col gap-s3">
        <div className="flex items-baseline justify-between">
          <span className="lbl">{label}</span>
          <span className={cn("num text-t5", tone)}>${dec(price, 2)}</span>
        </div>
        <span className="text-t3 text-bone-2">
          {isLong ? "Expect volatility ↑" : "Expect volatility ↓"}
        </span>

        <label className="flex flex-col gap-s1">
          <span className="lbl">Amount (USDC)</span>
          <input
            type="number"
            min={0}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="border border-hair px-s3 py-s2 text-t4 num bg-transparent"
          />
        </label>

        <span className="text-t3 text-bone-2 num">
          {int(amount)} USDC → ≈ {int(estimate)} {label}
        </span>

        <button
          type="button"
          onClick={() => onBuy(side, amount)}
          disabled={amount <= 0 || busy}
          className={cn(
            "px-s4 py-s3 text-ink text-t3 text-center font-medium hover:opacity-90 transition-opacity duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed",
            isLong ? "bg-up" : "bg-down",
          )}
        >
          {busy ? "Confirm in wallet…" : `Buy ${label}`}
        </button>
      </div>
    </div>
  );
}
