"use client";

import { useState } from "react";
import { Plate, Stat } from "./Stat";
import { ProtectionAmountControl } from "./ProtectionAmountControl";
import { PremiumSummary } from "./PremiumSummary";
import { ArcPaymentIndicator } from "./ArcPaymentIndicator";
import { ArcMark } from "./ArcMark";
import { ActiveProtection } from "./ActiveProtection";
import { useLiquidity } from "@/app/app/lib/liquidity-context";
import { premiumPerSec, type LiquidityParams } from "@/app/app/lib/liquidity-data";
import type { Market, PoolSlug } from "@/app/app/lib/market-data";
import { int } from "@/app/app/lib/format";

/**
 * The decision and the action. Big context sits on the left of the page;
 * this rail is where the LP chooses coverage, sees what the stream costs,
 * and starts it. The one primary (pink) action on the page. Swaps to a
 * management view once protection is running.
 */
export function ProtectionPanel({
  slug,
  market,
  params,
  positionUsd,
}: {
  slug: PoolSlug;
  market: Market;
  params: LiquidityParams;
  positionUsd: number;
}) {
  const { protection, start, adjust, stop } = useLiquidity();
  const active = protection[slug];

  const [protectedUsd, setProtectedUsd] = useState(
    () => active?.protectedUsd ?? Math.round(positionUsd * 0.5),
  );
  const [confirming, setConfirming] = useState(false);

  if (active) {
    return (
      <Plate className="p-s4">
        <ActiveProtection
          state={active}
          positionUsd={positionUsd}
          params={params}
          onAdjust={(n) => adjust(slug, n)}
          onStop={() => stop(slug)}
        />
      </Plate>
    );
  }

  const perSec = premiumPerSec(protectedUsd, params);

  return (
    <Plate className="p-s4 flex flex-col gap-s4">
      <span className="lbl">Protect your liquidity</span>

      <Stat layout="value-first" size="lg" label="Your position" value={`$${int(positionUsd)}`} />

      <div className="ruled pt-s4 flex flex-col gap-s4">
        <ProtectionAmountControl
          positionUsd={positionUsd}
          value={protectedUsd}
          onChange={setProtectedUsd}
        />

        <PremiumSummary perSec={perSec} protectedUsd={protectedUsd} />

        <ArcPaymentIndicator />

        <div className="flex flex-col gap-s2">
          <button
            type="button"
            disabled={protectedUsd <= 0 || confirming}
            onClick={() => {
              setConfirming(true);
              window.setTimeout(() => {
                start(slug, protectedUsd);
                setConfirming(false);
              }, 600);
            }}
            className="bg-pink text-ink px-s4 py-s3 text-t3 text-center font-medium hover:opacity-90 transition-opacity duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirming
              ? `Confirming · epoch ${String(market.epoch.index).padStart(2, "0")}`
              : "Start protection"}
          </button>
          <span className="num text-t2 text-bone-3">
            Payments via <ArcMark />
          </span>
        </div>
      </div>
    </Plate>
  );
}
