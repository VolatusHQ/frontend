"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarket, poolDisplay } from "../../lib/market-data";
import { getLiquidityParams } from "../../lib/liquidity-data";
import { useLiquidity } from "../../lib/liquidity-context";
import { REAL_POOL } from "../../lib/live-market";
import { Breadcrumb } from "../../components/volatus/AppShell";
import { Plate } from "../../components/volatus/Stat";
import { LiquidityPoolHeader } from "../../components/volatus/LiquidityPoolHeader";
import { PoolConditions } from "../../components/volatus/PoolConditions";
import { MarketPositioning } from "../../components/volatus/MarketPositioning";
import { VolatilityHistoryChart } from "../../components/volatus/VolatilityHistoryChart";
import { LpRiskEstimate } from "../../components/volatus/LpRiskEstimate";
import { ProtectionPanel } from "../../components/volatus/ProtectionPanel";
import { AddLiquidityDialog } from "../../components/volatus/AddLiquidityDialog";
import { RealLiquidityDetail } from "../../components/volatus/RealLiquidityDetail";

/**
 * The main Liquidity experience. Left column moves through the LP's
 * economic story — position (header) → pool conditions → what the market
 * is betting → what that could mean for the position. Right rail is the
 * decision: how much to protect, what the stream costs, start it.
 *
 * The real pool (`REAL_POOL.slug`) is not in `market-data.ts`'s mock
 * `MARKETS` map at all — `getMarket` would 404 it — and even a matching slug
 * wouldn't help, since every component below depends on `liquidity-data.ts`'s
 * hand-authored per-pool numbers with no honest equivalent for a real
 * position. It gets its own, simpler, fully-real detail view instead.
 */
export default function LiquidityPoolPage({ params }: { params: Promise<{ pool: string }> }) {
  const { pool: slug } = use(params);
  if (slug === REAL_POOL.slug) return <RealLiquidityDetail />;

  const market = getMarket(slug);
  if (!market) notFound();

  const paramsForPool = getLiquidityParams(slug)!;
  const { positions, addLiquidity } = useLiquidity();
  const position = positions[market.pool.slug];

  if (!position) {
    return (
      <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
        <div className="flex flex-col gap-s3">
          <Breadcrumb
            trail={[
              { label: "Liquidity", href: "/app/liquidity" },
              { label: poolDisplay(market.pool) },
            ]}
          />
          <h1 className="font-serif text-d3 font-medium leading-[1.12] tracking-[-0.012em] m-0">
            {poolDisplay(market.pool)}
          </h1>
        </div>
        <div className="ruled pt-s4 flex flex-col gap-s2 max-w-[60ch]">
          <span className="lbl">No position</span>
          <p className="text-t4 text-bone-2 m-0">
            You have no liquidity in this pool.{" "}
            <Link
              href="/app/liquidity"
              className="text-bone underline decoration-hair-lit underline-offset-4 hover:text-pink transition-colors duration-[140ms]"
            >
              View your positions
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <LiquidityPoolHeader market={market} position={position} activity={paramsForPool.activity} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] gap-s6 items-start">
        <div className="min-w-0 flex flex-col gap-s6">
          <PoolConditions market={market} />
          <MarketPositioning market={market} />
          <Plate className="p-s4">
            <VolatilityHistoryChart history={market.history} />
          </Plate>
          <LpRiskEstimate positionUsd={position.valueUsd} params={paramsForPool} />
        </div>

        <aside className="flex flex-col gap-s4 min-w-0 lg:sticky lg:top-s4">
          <ProtectionPanel
            slug={market.pool.slug}
            market={market}
            params={paramsForPool}
            positionUsd={position.valueUsd}
          />
          <div className="flex justify-end">
            <AddLiquidityDialog onAdd={(usd) => addLiquidity(market.pool.slug, usd)} />
          </div>
        </aside>
      </div>
    </div>
  );
}
