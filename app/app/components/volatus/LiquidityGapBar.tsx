import { compactUsd, int, pct } from "@/app/app/lib/format";
import type { LiveUnderwritePool } from "@/app/app/lib/live-market";

/**
 * The pool's protected / unprotected split, strictly to scale. The point it
 * has to make on sight: most LP liquidity in the pool is unprotected.
 *
 * The bar stays honest — a $5,000 sponsorship against a $40M pool is a
 * sliver, so the impact story is carried by the multiple elsewhere, not by
 * a padded segment here. A pending sponsorship shows only as a caption.
 *
 * Renders an honest note instead of a bar when `pool.protectedUsd` is
 * `null` — the underlying pool has no real dollar price to split (see
 * `live-market.ts`), so a bar here would be a fabricated 0%/100% split.
 */
export function LiquidityGapBar({
  pool,
  previewCapitalUsd,
  previewSupportedUsd,
}: {
  pool: LiveUnderwritePool;
  previewCapitalUsd?: number;
  previewSupportedUsd?: number;
}) {
  if (pool.protectedUsd === null || pool.unprotectedUsd === null) {
    return (
      <div className="flex flex-col gap-s3">
        <div className="flex items-baseline justify-between gap-s4">
          <span className="lbl">Capacity posted</span>
          <span className="num text-t4 text-bone">{compactUsd(pool.capacityUsd)}</span>
        </div>
        <p className="text-t3 text-bone-2 m-0">
          The protected/unprotected split isn&apos;t modeled for this pool — the underlying
          mWETH/mUSDC pair is mock-priced 1:1 and has no real dollar value to split.
        </p>
      </div>
    );
  }

  const protectedUsd = pool.protectedUsd;
  const unprotectedUsd = pool.unprotectedUsd;
  const liquidityUsd = protectedUsd + unprotectedUsd;
  const protectedFrac = liquidityUsd > 0 ? protectedUsd / liquidityUsd : 0;
  const showPreview =
    typeof previewCapitalUsd === "number" &&
    previewCapitalUsd > 0 &&
    typeof previewSupportedUsd === "number" &&
    previewSupportedUsd > 0;

  return (
    <div className="flex flex-col gap-s3">
      <div className="flex items-baseline justify-between gap-s4">
        <span className="lbl">Total liquidity</span>
        <span className="num text-t4 text-bone">{compactUsd(liquidityUsd)}</span>
      </div>

      <div
        className="flex h-s3 w-full"
        role="img"
        aria-label={`${pct(protectedFrac)} of pool liquidity protected, ${pct(1 - protectedFrac)} unprotected`}
      >
        <div className="bg-violet h-full" style={{ width: `${protectedFrac * 100}%` }} />
        <div className="bg-hair-lit h-full" style={{ width: `${(1 - protectedFrac) * 100}%` }} />
      </div>

      <div className="flex flex-wrap justify-between gap-x-s5 gap-y-s1 text-t3 text-bone-2">
        <span>
          Protected <span className="num text-bone">{compactUsd(protectedUsd)}</span> · {pct(protectedFrac)}
        </span>
        <span>
          Unprotected <span className="num text-bone">{compactUsd(unprotectedUsd)}</span> · {pct(1 - protectedFrac)}
        </span>
      </div>

      {showPreview ? (
        <p className="num text-t3 text-bone-2 m-0 ruled pt-s3">
          Your ${int(previewCapitalUsd!)} → ~${int(previewSupportedUsd!)} toward protected liquidity
        </p>
      ) : null}
    </div>
  );
}
