"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { MARKETS } from "../../lib/market-data";
import { marketLeaning } from "../../lib/liquidity-data";
import { getUnderwritePool, estimateLiquiditySupported } from "../../lib/underwrite-data";
import { useSponsorship } from "../../lib/sponsorship-context";
import { int, pct } from "../../lib/format";
import { Block } from "../../components/volatus/Stat";
import { Sparkline } from "../../components/volatus/Sparkline";
import { UnderwritePoolHeader } from "../../components/volatus/UnderwritePoolHeader";
import { LiquidityGapBar } from "../../components/volatus/LiquidityGapBar";
import { SponsorshipOpportunity } from "../../components/volatus/SponsorshipOpportunity";
import { SponsorPanel } from "../../components/volatus/SponsorPanel";

export default function UnderwritePoolDetailPage({
  params,
}: {
  params: Promise<{ pool: string }>;
}) {
  const { pool: slug } = use(params);
  const pool = getUnderwritePool(slug);
  if (!pool) notFound();

  const market = MARKETS[pool.slug];
  const { sponsorships, sponsor, adjust, withdraw } = useSponsorship();
  const sponsorship = sponsorships[pool.slug];

  // Seeded pools mount with a sponsorship already active, so the manage
  // control starts on its committed figure; otherwise on the suggestion.
  // Every later transition (sponsor / adjust / withdraw) keeps `amount` and
  // the committed capital consistent on its own, so no effect is needed.
  const [amount, setAmount] = useState(
    sponsorship ? sponsorship.capitalUsd : pool.suggestedSponsorshipUsd,
  );

  const supported = estimateLiquiditySupported(amount, pool.impactMultiple);

  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <UnderwritePoolHeader pool={pool} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] gap-s6 items-start">
        <div className="min-w-0 flex flex-col gap-s6">
          <Block title="Liquidity" plate>
            <LiquidityGapBar
              pool={pool}
              previewCapitalUsd={sponsorship ? undefined : amount}
              previewSupportedUsd={sponsorship ? undefined : supported}
            />
          </Block>

          <Block title="Pool conditions">
            <div className="flex flex-col gap-s3">
              <div className="flex flex-wrap items-end justify-between gap-s4">
                <div className="flex gap-s5">
                  <div className="flex flex-col gap-[2px]">
                    <span className="num text-t4 text-pink">{pct(market.impliedVol)}</span>
                    <span className="lbl">implied</span>
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <span className="num text-t4 text-yellow">{pct(market.realizedVol)}</span>
                    <span className="lbl">realized</span>
                  </div>
                </div>
                <Sparkline
                  realized={market.history.map((p) => p.realized)}
                  implied={market.history.map((p) => p.implied)}
                  width={150}
                  height={44}
                />
              </div>
              <p className="text-t3 text-bone-2 m-0 max-w-[60ch]">
                The volatility market is leaning toward{" "}
                <span className="text-bone">{marketLeaning(market).toLowerCase()}</span>. Realized
                vol over the last {market.history.length} epochs, implied in pink.
              </p>
            </div>
          </Block>

          <SponsorshipOpportunity
            pool={pool}
            onUseSuggested={() => setAmount(pool.suggestedSponsorshipUsd)}
          />

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
