"use client";

import { useState } from "react";
import { estimateLiquiditySupported } from "../../lib/underwrite-data";
import { useSponsorship } from "../../lib/sponsorship-context";
import { int, pct } from "../../lib/format";
import { formatSeverityLabel, type VolSeverity } from "../../lib/onchain/severity";
import { Block } from "./Stat";
import type { LiveUnderwritePool } from "../../lib/live-market";
import { UnderwritePoolHeader } from "./UnderwritePoolHeader";
import { LiquidityGapBar } from "./LiquidityGapBar";
import { SponsorshipOpportunity } from "./SponsorshipOpportunity";
import { SponsorPanel } from "./SponsorPanel";

/**
 * The pool page's client half — same split as `MarketDetail.tsx`, so the
 * server half (`app/underwrite/[pool]/page.tsx`) can await the chain read
 * and the interactive state (amount, sponsor/adjust/withdraw) stays here.
 *
 * `pool` and `severity` both come from live sources
 * (`live-market.ts`/`vol-history.ts`) — there is no mock fallback on this
 * page any more. See those modules for what is and isn't modeled on chain.
 */
export function UnderwriteDetail({ pool, severity }: { pool: LiveUnderwritePool; severity: VolSeverity | null }) {
  const { sponsorships, sponsor, adjust, withdraw } = useSponsorship();
  const sponsorship = sponsorships[pool.slug];

  // Seeded pools mount with a sponsorship already active, so the manage
  // control starts on its committed figure; otherwise on a starting
  // suggestion. Every later transition (sponsor / adjust / withdraw) keeps
  // `amount` and the committed capital consistent on its own.
  const [amount, setAmount] = useState(sponsorship ? sponsorship.capitalUsd : 1_000);

  const supported = pool.impactMultiple === null ? null : estimateLiquiditySupported(amount, pool.impactMultiple);

  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <UnderwritePoolHeader pool={pool} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] gap-s6 items-start">
        <div className="min-w-0 flex flex-col gap-s6">
          <Block title="Liquidity" plate>
            <LiquidityGapBar
              pool={pool}
              previewCapitalUsd={sponsorship ? undefined : amount}
              previewSupportedUsd={sponsorship || supported === null ? undefined : supported}
            />
          </Block>

          <Block title="Pool conditions">
            <div className="flex flex-col gap-s3">
              <div className="flex flex-wrap items-end justify-between gap-s4">
                <div className="flex gap-s5">
                  <div className="flex flex-col gap-[2px]">
                    <span className="num text-t4 text-pink">{pct(pool.impliedVol)}</span>
                    <span className="lbl">implied</span>
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <span className="num text-t4 text-yellow">{pct(pool.realizedVol)}</span>
                    <span className="lbl">realized</span>
                  </div>
                </div>
              </div>
              <p className="text-t3 text-bone-2 m-0 max-w-[60ch]">
                {severity
                  ? `Reads ${formatSeverityLabel(severity).toLowerCase()}, relative to this pool's own trailing history.`
                  : "Not enough trailing history yet to read this relative to the pool's own range."}
              </p>
            </div>
          </Block>

          <SponsorshipOpportunity severity={severity} />

          {pool.impactMultiple !== null && supported !== null ? (
            <Block title="Where your capital goes">
              <div className="flex flex-col gap-s3">
                <ol className="flex flex-col gap-s2 list-none p-0 m-0">
                  <FlowStep label="Sponsor capital" value={`$${int(amount)} committed`} />
                  <FlowStep label="↓ Protection capacity" value="funds LP protection" />
                  <FlowStep label="↓ LP protection" value="covers LPs against volatility" />
                  <FlowStep
                    label="↓ Liquidity supported"
                    value={<span className="num text-bone">~${int(supported)}</span>}
                  />
                </ol>
                <p className="text-t3 text-bone-3 m-0 max-w-[60ch]">
                  You fund protection for LPs — you are not adding liquidity to the pool yourself.
                </p>
              </div>
            </Block>
          ) : null}
        </div>

        <aside className="flex flex-col gap-s5 min-w-0 lg:sticky lg:top-s4">
          <SponsorPanel
            pool={pool}
            sponsorship={sponsorship}
            amount={amount}
            onAmountChange={setAmount}
            onSponsor={() => sponsor(pool.slug, amount)}
            onAdjust={() => adjust(pool.slug, amount)}
            onWithdraw={() => withdraw(pool.slug)}
          />
        </aside>
      </div>
    </div>
  );
}

function FlowStep({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-[2px] sm:flex-row sm:items-baseline sm:gap-x-s4">
      <span className="lbl sm:w-[216px] sm:shrink-0">{label}</span>
      <span className="text-t3 text-bone-2">{value}</span>
    </li>
  );
}
