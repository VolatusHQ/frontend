"use client";

import { Stat } from "./Stat";
import { TrendLine } from "./TrendLine";
import { MOCK_NOW, poolDisplay } from "@/app/app/lib/market-data";
import { agoSeconds, int } from "@/app/app/lib/format";
import { cn } from "@/app/app/lib/utils";
import {
  SPONSOR_QUICK_AMOUNTS,
  buildSupportTrail,
  estimateLiquiditySupported,
  type UnderwritePool,
} from "@/app/app/lib/underwrite-data";
import type { Sponsorship } from "@/app/app/lib/sponsorship-context";

/**
 * The right-rail decision surface — the Underwrite analog of TradePanel.
 * Before a commitment it answers one question, "what does my money do here",
 * with the multiple and the liquidity it supports as the largest figures on
 * the page. After a commitment it becomes a monitoring + management view.
 * One pink primary per state; withdraw is a text link.
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
  pool: UnderwritePool;
  sponsorship: Sponsorship | undefined;
  amount: number;
  onAmountChange: (n: number) => void;
  onSponsor: () => void;
  onAdjust: () => void;
  onWithdraw: () => void;
}) {
  const pair = poolDisplay(pool.pool);

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
    const supported = estimateLiquiditySupported(amount, pool.impactMultiple);
    return (
      <div className="flex flex-col gap-s4">
        <span className="lbl">Sponsor protection</span>
        {amountControl}

        <div className="ruled pt-s4 flex flex-col gap-s3">
          <Stat
            layout="value-first"
            size="hero"
            label="Liquidity supported"
            value={`~$${int(supported)}`}
          />
          <Stat
            layout="value-first"
            size="lg"
            label="Liquidity supported per $1 sponsored"
            value={`${pool.impactMultiple}×`}
          />
          <p className="num text-t3 text-bone-2 m-0">
            ${int(amount)} sponsored → ~${int(supported)} liquidity supported
          </p>
          <div className="flex flex-col gap-s1 text-t3 text-bone-2">
            <span>→ funds LP protection</span>
            <span>→ supports ~${int(supported)} liquidity</span>
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

  const committedSupported = estimateLiquiditySupported(
    sponsorship.capitalUsd,
    pool.impactMultiple,
  );
  const trail = buildSupportTrail(pool.slug, committedSupported);
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
          label="Liquidity supported"
          value={`~$${int(committedSupported)}`}
        />
        <div className="flex flex-wrap gap-x-s6 gap-y-s3">
          <Stat label="Capital committed" value={`$${int(sponsorship.capitalUsd)}`} />
          <Stat label="Impact" value={`${pool.impactMultiple}×`} />
          <Stat label="Started" value={agoSeconds(sponsorship.startedAt, MOCK_NOW)} />
        </div>
        <div className="flex flex-col gap-s1">
          <TrendLine points={trail} />
          <span className="text-t2 text-bone-3">Illustrative — since your sponsorship began</span>
        </div>
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
