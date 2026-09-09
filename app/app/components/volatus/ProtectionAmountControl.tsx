"use client";

import { coveragePct } from "@/app/app/lib/liquidity-data";
import { int, pct } from "@/app/app/lib/format";
import { cn } from "@/app/app/lib/utils";

const PRESETS = [0.25, 0.5, 0.75, 1] as const;

/**
 * How much of the position to protect. Preset fractions (the house
 * segmented pattern) plus a direct USDC figure — either updates coverage
 * and, through the parent, the premium. Kept deliberately simple.
 */
export function ProtectionAmountControl({
  positionUsd,
  value,
  onChange,
}: {
  positionUsd: number;
  value: number;
  onChange: (protectedUsd: number) => void;
}) {
  const coverage = coveragePct(value, positionUsd);

  return (
    <div className="flex flex-col gap-s3">
      <div className="flex border border-hair">
        {PRESETS.map((f) => {
          const active = Math.abs(coverage - f) < 0.005;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(Math.round(positionUsd * f))}
              className={cn(
                "flex-1 px-s3 py-[5px] text-t2 text-center transition-colors duration-[140ms]",
                active ? "bg-panel-2 text-bone" : "text-bone-3 hover:text-bone",
              )}
            >
              {pct(f, 0)}
            </button>
          );
        })}
      </div>

      <label className="flex flex-col gap-s1">
        <span className="lbl">Protection (USDC)</span>
        <input
          type="number"
          min={0}
          max={positionUsd}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value) || 0;
            onChange(Math.min(positionUsd, Math.max(0, Math.round(n))));
          }}
          className="border border-hair px-s3 py-s2 text-t4 num bg-transparent"
        />
      </label>

      <span className="num text-t3 text-bone-2">
        {pct(coverage, 0)} of position · ${int(positionUsd)} total
      </span>
    </div>
  );
}
