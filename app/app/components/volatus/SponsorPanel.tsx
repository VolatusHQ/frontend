"use client";

import { useState } from "react";
import { Stat } from "./Stat";
import { poolDisplay } from "@/app/app/lib/market-data";
import { agoSeconds, compactUsd, int } from "@/app/app/lib/format";
import { cn } from "@/app/app/lib/utils";
import { SPONSOR_QUICK_AMOUNTS } from "@/app/app/lib/underwrite-data";
import type { LiveUnderwritePool } from "@/app/app/lib/live-market";
import type { Sponsorship } from "@/app/app/lib/sponsorship-context";

/**
 * The right-rail decision surface — the Underwrite analog of TradePanel.
 *
 * The prototype framed this around an "impact multiple" (liquidity
 * supported per $1 sponsored) that is not modeled on this pool — see
 * `live-market.ts`. Real numbers exist and are shown instead: your capital
 * as a share of the live `SigmaStream` capacity pool. One pink primary per
 * state; withdraw is a text link.
 */
export function SponsorPanel({
  pool,
  sponsorship,
  amount,
  onAmountChange,
  onSponsor,
  onAdjust,
  onWithdraw,
}: {
  pool: LiveUnderwritePool;
  sponsorship: Sponsorship | undefined;
  amount: number;
  onAmountChange: (n: number) => void;
  onSponsor: () => void;
  onAdjust: () => void;
  onWithdraw: () => void;
}) {
  const pair = poolDisplay(pool.pool);
  // Lazy initializer, not a bare `Date.now()` call during render -- runs
  // once on mount, which is the React-idiomatic way to capture "now" without
  // an impure call in the render body itself.
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  const amountControl = (
    <div className="flex flex-col gap-s3">
      <label className="flex flex-col gap-s1">
        <span className="lbl">Sponsorship (USDC)</span>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => onAmountChange(Math.max(0, Number(e.target.value) || 0))}
          className="border border-hair px-s3 py-s2 text-t4 num bg-transparent"
        />
      </label>
      <div className="grid grid-cols-4 gap-s2">
        {SPONSOR_QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onAmountChange(q)}
            aria-pressed={amount === q}
            className={cn(
              "py-s2 text-t2 num text-center border transition-colors duration-[140ms]",
              amount === q
                ? "border-hair-lit text-bone bg-panel-2"
                : "border-hair text-bone-2 hover:text-bone",
            )}
          >
            ${q >= 1000 ? `${q / 1000}k` : q}
          </button>
        ))}
      </div>
    </div>
  );

  if (!sponsorship) {
    const poolAfter = pool.capacityUsd + Math.max(0, amount);
    const shareAfter = poolAfter > 0 ? amount / poolAfter : 0;

    return (
      <div className="flex flex-col gap-s4">
        <span className="lbl">Sponsor protection</span>
        {amountControl}

        <div className="ruled pt-s4 flex flex-col gap-s3">
          <Stat
            layout="value-first"
            size="hero"
            label="Capacity pool today"
            value={compactUsd(pool.capacityUsd)}
          />
          <p className="num text-t3 text-bone-2 m-0">
            ${int(amount)} sponsored → ~{(shareAfter * 100).toFixed(1)}% of the pool, at today&apos;s size
          </p>
          <div className="flex flex-col gap-s1 text-t3 text-bone-2">
            <span>→ mints shares against the pool&apos;s current value</span>
            <span>→ funds coverage for subscribers streaming premium</span>
            <span>→ helps retain liquidity in {pair}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSponsor}
          disabled={amount <= 0}
          className="bg-pink text-ink px-s4 py-s3 text-t3 text-center font-medium hover:opacity-90 transition-opacity duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sponsor protection
        </button>
      </div>
    );
  }

  const shareOfPool = pool.capacityUsd > 0 ? sponsorship.capitalUsd / pool.capacityUsd : 0;
  const pending = amount > 0 && amount !== sponsorship.capitalUsd;

  return (
    <div className="flex flex-col gap-s4">
      <div className="flex items-center justify-between gap-s3">
        <span className="lbl">Your sponsorship</span>
        <span className="text-t3 text-bone-2 flex items-center gap-s2">
          <span aria-hidden="true" className="text-pink">
            ●
          </span>
          Active
        </span>
      </div>

      <div className="ruled pt-s4 flex flex-col gap-s4">
        <Stat
          layout="value-first"
          size="hero"
          label="Capital committed"
          value={`$${int(sponsorship.capitalUsd)}`}
        />
        <div className="flex flex-wrap gap-x-s6 gap-y-s3">
          <Stat label="Share of capacity pool" value={`${(shareOfPool * 100).toFixed(1)}%`} />
          <Stat label="Capacity pool today" value={compactUsd(pool.capacityUsd)} />
          <Stat
            label="Started"
            value={sponsorship.startedAt === null ? "not tracked" : agoSeconds(sponsorship.startedAt, nowSeconds)}
          />
        </div>
        <p className="text-t2 text-bone-3 m-0">
          Premium earned while you hold shares accrues to you; withdrawing realizes your pro-rata
          share of the pool, including any claims paid.
        </p>
      </div>

      <div className="ruled pt-s4 flex flex-col gap-s3">
        <span className="lbl">Manage</span>
        {amountControl}
        <button
          type="button"
          onClick={onAdjust}
          disabled={!pending}
          className="bg-pink text-ink px-s4 py-s3 text-t3 text-center font-medium hover:opacity-90 transition-opacity duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Update sponsorship
        </button>
        <button
          type="button"
          onClick={onWithdraw}
          className="text-t3 text-bone-3 hover:text-bone underline underline-offset-2 self-start"
        >
          Withdraw sponsorship
        </button>
      </div>
    </div>
  );
}
