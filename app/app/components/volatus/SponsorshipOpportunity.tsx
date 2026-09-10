"use client";

import { Block, Stat } from "./Stat";
import { compactUsd, int } from "@/app/app/lib/format";
import {
  estimateLiquiditySupported,
  type UnderwritePool,
} from "@/app/app/lib/underwrite-data";

/**
 * The §18 read: how strong the case is, why (exposed liquidity), and one
 * illustrative starting point the sponsor can adopt with a click. Framed as
 * an estimate on mock conditions, never as advice.
 */
export function SponsorshipOpportunity({
  pool,
  onUseSuggested,
}: {
  pool: UnderwritePool;
  onUseSuggested: () => void;
}) {
  const illustrative = estimateLiquiditySupported(
    pool.suggestedSponsorshipUsd,
    pool.impactMultiple,
  );

  return (
    <Block title="Sponsorship opportunity">
      <div className="flex flex-col gap-s3">
        <Stat
          size="lg"
          label="Assessment"
          value={pool.opportunity}
          sub={`${compactUsd(pool.unprotectedUsd)} of LP liquidity is currently unprotected.`}
        />

        <div className="ruled pt-s3 flex flex-wrap gap-x-s6 gap-y-s3">
          <Stat label="Suggested sponsorship" value={`$${int(pool.suggestedSponsorshipUsd)}`} />
          <Stat label="Illustrative impact" value={`~$${int(illustrative)}`} />
        </div>

        <div className="flex flex-wrap items-center gap-x-s3 gap-y-s1">
          <button
            type="button"
            onClick={onUseSuggested}
            className="text-t3 text-bone-2 hover:text-bone underline underline-offset-2"
          >
            Use this amount
          </button>
          <span className="text-t2 text-bone-3">Estimates use current mock conditions.</span>
        </div>
      </div>
    </Block>
  );
}
