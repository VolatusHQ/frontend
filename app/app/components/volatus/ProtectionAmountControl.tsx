"use client";

import { coveragePct } from "@/app/app/lib/liquidity-data";
import { int, pct } from "@/app/app/lib/format";
import { useAmountInput } from "@/app/app/lib/useAmountInput";
import { cn } from "@/app/app/lib/utils";

const PRESETS = [0.25, 0.5, 0.75, 1] as const;

/**
 * How much of the position to protect. Preset fractions (the house
 * segmented pattern) plus a direct USDC figure — either updates coverage
 * and, through the parent, the premium. Kept deliberately simple.
 */
export function ProtectionAmountControl({
  positionUsd,
  value: initialValue,
  onChange,
}: {
  positionUsd: number;
  value: number;
  onChange: (protectedUsd: number) => void;
}) {
  // Raw-typing state lives here, not in the parent — see useAmountInput's
  // doc for why a controlled input can't just echo back a rounded/clamped
  // prop. `onChange` still tells the parent every time the clamped amount
  // changes, since it's what actually feeds the premium calculation.
  const { raw, setRaw, amount } = useAmountInput(initialValue);
  const value = Math.min(positionUsd, amount);
  const coverage = coveragePct(value, positionUsd);

  function updateRaw(next: string) {
    setRaw(next);
    const n = Math.min(positionUsd, Math.max(0, Math.round(Number(next) || 0)));
    onChange(n);
  }

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
              onClick={() => updateRaw(String(Math.round(positionUsd * f)))}
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
          value={raw}
          onChange={(e) => updateRaw(e.target.value)}
          className="border border-hair px-s3 py-s2 text-t4 num bg-transparent"
        />
      </label>

      <span className="num text-t3 text-bone-2">
        {pct(coverage, 0)} of position · ${int(positionUsd)} total
      </span>
    </div>
  );
}
