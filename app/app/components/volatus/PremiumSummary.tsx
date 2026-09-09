import { Stat } from "./Stat";
import { dec, int, rate } from "@/app/app/lib/format";

/**
 * The streaming premium. The per-second rate leads because the payment is
 * continuously streamed, not bought once; the per-day figure is the
 * human-readable equivalent. The last line ties cost to what it buys, so
 * the economic consequence never has to be worked out.
 */
export function PremiumSummary({
  perSec,
  protectedUsd,
}: {
  perSec: number;
  protectedUsd: number;
}) {
  const perDay = perSec * 86_400;

  return (
    <div className="flex flex-col gap-s3">
      <Stat
        layout="value-first"
        label="Current premium"
        value={
          <>
            {rate(perSec)} <span className="text-t3 text-bone-2">USDC / sec</span>
          </>
        }
        sub={`≈ $${dec(perDay, 2)} / day`}
      />
      <span className="num text-t3 text-bone-2">
        ${dec(perDay, 2)}/day → ${int(protectedUsd)} protected
      </span>
    </div>
  );
}
