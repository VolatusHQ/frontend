"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Trade } from "@/app/app/lib/candles";
import type { Market } from "@/app/app/lib/market-data";
import type { VolSeverity } from "@/app/app/lib/onchain/severity";
import { usePositions } from "@/app/app/lib/positions-context";
import { errorMessage } from "@/app/app/lib/onchain/writes";
import { useLiveMarket } from "@/app/app/lib/live-feed";
import { PoolHeader } from "./PoolHeader";
import { TradingChart } from "./TradingChart";
import { TradePanel } from "./TradePanel";
import { PositionsPanel } from "./PositionsPanel";

/**
 * The pool page's client half. Same arrangement as before; the difference is
 * that the figures come from the chain and Buy sends a transaction.
 *
 */
export function MarketDetail({
  market,
  swaps,
  severity,
}: {
  market: Market;
  swaps: Trade[];
  severity?: VolSeverity | null;
}) {
  const { positions, trades, buy, ready, epochPositions, redeem, loadingHistory } = usePositions();
  const position = positions[market.pool.slug];
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Neither the Buy button nor a redeem row disabled itself while its own
  // transaction was in flight, so a second click (or a MetaMask popup left
  // open while the user clicked again) fired a second overlapping approve +
  // swap sequence against the same wallet — two transactions racing for the
  // same nonce, which is what "nonce too low" and MetaMask's own corrupted
  // "gasLimit is null" error both actually were. One in-flight flag for the
  // whole panel is simpler than tracking it per action and just as correct,
  // since Buy and Redeem were never meant to run concurrently anyway.
  const [busy, setBusy] = useState(false);
  // The chart's own feed: `swaps` (server-rendered, this epoch's history so
  // far) plus whatever's landed since, pushed from the roller over a real
  // WebSocket rather than waiting on `router.refresh()` or the next ISR tick.
  const { trades: liveSwaps } = useLiveMarket(swaps);

  async function onRedeem(epochId: bigint, isLong: boolean, amount: number) {
    if (!ready) {
      setFailed(true);
      setStatus("Connect a wallet first.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setFailed(false);
    setStatus(`Redeeming epoch ${epochId} ${isLong ? "STORM" : "CALM"}…`);
    try {
      await redeem(epochId, isLong, amount);
      setStatus("Redeemed.");
      router.refresh();
    } catch (e) {
      setFailed(true);
      setStatus(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onBuy(side: "long" | "short", amount: number) {
    if (!ready) {
      setFailed(true);
      setStatus("Connect a wallet first.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setFailed(false);
    setStatus(
      side === "long"
        ? "Buying VAR-LONG in the variance pool…"
        : "Minting a pair and selling the long leg…",
    );
    try {
      await buy(market.pool.slug, side, amount);
      setStatus("Confirmed.");
      router.refresh();
    } catch (e) {
      setFailed(true);
      setStatus(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <PoolHeader market={market} status={market.epoch.status ?? "Active"} severity={severity} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] gap-s6 items-start">
        <div className="min-w-0">
          <TradingChart trades={liveSwaps} pool={market.pool} />
        </div>

        <aside className="flex flex-col gap-s5 min-w-0 lg:sticky lg:top-s4">
          <TradePanel market={market} onBuy={onBuy} busy={busy} />
          {status ? (
            <p className={`text-t2 m-0 ${failed ? "text-down" : "text-bone-2"}`}>{status}</p>
          ) : null}
        </aside>
      </div>

      <PositionsPanel
        slug={market.pool.slug}
        market={market}
        position={position}
        trades={trades}
        epochPositions={epochPositions}
        onRedeem={onRedeem}
        loading={loadingHistory}
      />
    </div>
  );
}
