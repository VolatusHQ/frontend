"use client";

import { useEffect, useState } from "react";
import { Stat, Ticker } from "./Stat";
import { ProtectionAmountControl } from "./ProtectionAmountControl";
import { PremiumSummary } from "./PremiumSummary";
import { ArcPaymentIndicator } from "./ArcPaymentIndicator";
import { StopProtectionDialog } from "./StopProtectionDialog";
import { MOCK_NOW } from "@/app/app/lib/market-data";
import { coveragePct, premiumPerSec, type LiquidityParams } from "@/app/app/lib/liquidity-data";
import type { ProtectionState } from "@/app/app/lib/liquidity-context";
import { int, pct, rate, usdc } from "@/app/app/lib/format";

/** Elapsed seconds since a MOCK_NOW-relative start, ticking up live. */
function useElapsedSeconds(startedAt: number): number {
  const [elapsed, setElapsed] = useState(() => Math.max(0, MOCK_NOW - startedAt));
  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return elapsed;
}

function elapsedLabel(total: number): string {
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3_600);
  const m = Math.floor((total % 3_600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Protection is running: a management view, not a purchase view. The
 * premium-spent counter ticks so the ongoing payment stream is unmistakable.
 */
export function ActiveProtection({
  state,
  positionUsd,
  params,
  onAdjust,
  onStop,
}: {
  state: ProtectionState;
  positionUsd: number;
  params: LiquidityParams;
  onAdjust: (protectedUsd: number) => void;
  onStop: () => void;
}) {
  const elapsed = useElapsedSeconds(state.startedAt);
  const spent = state.premiumPerSec * elapsed;
  const coverage = coveragePct(state.protectedUsd, positionUsd);

  const [adjusting, setAdjusting] = useState(false);
  const [draft, setDraft] = useState(state.protectedUsd);

  return (
    <div className="flex flex-col gap-s4">
      <div className="flex items-baseline justify-between gap-s4">
        <span className="lbl">Protection</span>
        <span className="num text-t3 text-bone flex items-center gap-s2">
          <span aria-hidden="true" className="text-violet">
            ●
          </span>
          Active
        </span>
      </div>

      <div className="ruled pt-s4 flex flex-col gap-s4">
        <Stat
          layout="value-first"
          size="lg"
          label="Protected"
          value={`$${int(state.protectedUsd)}`}
          sub={`${pct(coverage, 0)} coverage`}
        />

        <div className="flex flex-col gap-s4">
          <Stat
            layout="value-first"
            label="Premium"
            value={
              <>
                {rate(state.premiumPerSec)} <span className="text-t3 text-bone-2">USDC / sec</span>
              </>
            }
          />
          <div className="flex flex-col gap-s1">
            <Ticker
              value={`$${usdc(spent)}`}
              cause={`streaming ${rate(state.premiumPerSec)} USDC/sec via Arc`}
              className="text-[20px]"
            />
            <span className="lbl">Premium spent</span>
          </div>
          <Stat layout="value-first" label="Active for" value={elapsedLabel(elapsed)} />
        </div>

        <ArcPaymentIndicator />
      </div>

      {adjusting ? (
        <div className="ruled pt-s4 flex flex-col gap-s4">
          <ProtectionAmountControl positionUsd={positionUsd} value={draft} onChange={setDraft} />
          <PremiumSummary perSec={premiumPerSec(draft, params)} protectedUsd={draft} />
          <div className="flex items-center gap-s4">
            <button
              type="button"
              onClick={() => {
                onAdjust(draft);
                setAdjusting(false);
              }}
              disabled={draft <= 0}
              className="bg-pink text-ink px-s4 py-s3 text-t3 font-medium hover:opacity-90 transition-opacity duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm adjustment
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(state.protectedUsd);
                setAdjusting(false);
              }}
              className="text-t3 text-bone-2 hover:text-bone transition-colors duration-[140ms]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-s5">
          <button
            type="button"
            onClick={() => {
              setDraft(state.protectedUsd);
              setAdjusting(true);
            }}
            className="text-t3 text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms]"
          >
            Adjust protection
          </button>
          <StopProtectionDialog onConfirm={onStop} />
        </div>
      )}
    </div>
  );
}
