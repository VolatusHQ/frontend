"use client";

import { Fragment, useState } from "react";
import type { Market, PoolSlug } from "@/app/app/lib/market-data";
import type { Position, Trade } from "@/app/app/lib/positions-context";
import type { EpochPosition } from "@/app/app/lib/onchain/epoch-positions";
import { MOCK_NOW } from "@/app/app/lib/market-data";
import { agoSeconds, dec, int, usdc } from "@/app/app/lib/format";
import { cn } from "@/app/app/lib/utils";

type Tab = "positions" | "history";

/**
 * Two tabs — Positions, History — both real tables, not cards. A deliberate
 * departure from DESIGN.md §5's "radius is 0 or a circle": this panel is
 * explicitly rounded and boxed, a direct product decision for this surface
 * rather than the rest of the application's flat/ruled convention.
 */
export function PositionsPanel({
  slug,
  market,
  position,
  trades,
  epochPositions,
  onRedeem,
  loading,
}: {
  slug: PoolSlug;
  market: Market;
  position: Position | undefined;
  trades: Trade[];
  /** Every epoch's holdings still on chain, current epoch included — see
   *  `epoch-positions.ts`'s module doc for why this replaces a single
   *  current-epoch-only balance. */
  epochPositions: EpochPosition[];
  onRedeem: (epochId: bigint, isLong: boolean, amount: number) => Promise<void>;
  /** True while the chain-derived positions/trades scan is still in flight —
   *  without this, a fetch still in progress and a genuinely empty wallet
   *  render identically as "no trades yet", which reads as broken rather
   *  than as loading. */
  loading: boolean;
}) {
  const poolTrades = trades.filter((t) => t.slug === slug);
  const [tab, setTab] = useState<Tab>(position || epochPositions.length ? "positions" : "history");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="rounded-[16px] border border-hair bg-panel overflow-hidden">
      <div className="flex border-b border-hair">
        <TabButton active={tab === "positions"} onClick={() => setTab("positions")}>
          Positions{epochPositions.length ? ` (${epochPositions.length})` : ""}
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          History{poolTrades.length ? ` (${poolTrades.length})` : ""}
        </TabButton>
      </div>

      {tab === "positions" ? (
        <PositionsTable market={market} epochPositions={epochPositions} onRedeem={onRedeem} loading={loading} />
      ) : (
        <HistoryTable trades={poolTrades} openId={openId} onToggle={setOpenId} loading={loading} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 px-s4 py-s3 text-t3 text-center font-medium transition-colors duration-[140ms]",
        active ? "text-bone bg-panel-2" : "text-bone-3 hover:text-bone",
      )}
    >
      {children}
    </button>
  );
}

const TH = "lbl text-left font-medium py-s3 px-s4";
const TD = "text-t3 py-s3 px-s4";

type PositionRow = {
  key: string;
  epochId: bigint;
  side: "LONG" | "SHORT";
  isLong: boolean;
  size: number;
  status: "Active" | "Awaiting settlement" | "Settled" | "Redeemed";
  /** Live market price for an active epoch; the frozen payoff ratio once settled. */
  price: number;
  value: number;
  redeemable: boolean;
};

function toRows(epochPositions: EpochPosition[], market: Market): PositionRow[] {
  const rows: PositionRow[] = [];
  for (const p of epochPositions) {
    const payoffRatio = Number(p.payoffWad) / 1e18;

    // A redeemed leg's balance is 0 by definition — that row is done trading
    // and stays only as the closed record of what it paid out, not as a
    // holding that could still be worth something.
    if (p.longSize === 0 && p.longRedeemedUsdc !== null) {
      rows.push({
        key: `${p.epochId}-long`,
        epochId: p.epochId,
        side: "LONG",
        isLong: true,
        size: 0,
        status: "Redeemed",
        price: payoffRatio,
        value: p.longRedeemedUsdc,
        redeemable: false,
      });
    }
    if (p.shortSize === 0 && p.shortRedeemedUsdc !== null) {
      rows.push({
        key: `${p.epochId}-short`,
        epochId: p.epochId,
        side: "SHORT",
        isLong: false,
        size: 0,
        status: "Redeemed",
        price: 1 - payoffRatio,
        value: p.shortRedeemedUsdc,
        redeemable: false,
      });
    }

    const status: PositionRow["status"] = p.settled
      ? "Settled"
      : p.isCurrent
        ? "Active"
        : "Awaiting settlement";

    if (p.longSize > 0) {
      const price = p.settled ? payoffRatio : p.isCurrent ? market.longPrice : 0;
      rows.push({
        key: `${p.epochId}-long`,
        epochId: p.epochId,
        side: "LONG",
        isLong: true,
        size: p.longSize,
        status,
        price,
        value: p.longSize * price,
        redeemable: p.settled,
      });
    }
    if (p.shortSize > 0) {
      const price = p.settled ? 1 - payoffRatio : p.isCurrent ? market.shortPrice : 0;
      rows.push({
        key: `${p.epochId}-short`,
        epochId: p.epochId,
        side: "SHORT",
        isLong: false,
        size: p.shortSize,
        status,
        price,
        value: p.shortSize * price,
        redeemable: p.settled,
      });
    }
  }
  // Newest epoch first, long before short within an epoch.
  return rows.sort((a, b) => Number(b.epochId - a.epochId) || Number(b.isLong) - Number(a.isLong));
}

const STATUS_TONE: Record<PositionRow["status"], string> = {
  Active: "text-bone-2",
  "Awaiting settlement": "text-bone-3",
  Settled: "text-up",
  Redeemed: "text-bone-3",
};

/**
 * Holdings, not P/L. Entry price and cost basis were dropped when this moved
 * on chain: the vault records balances, and nothing anywhere records what a
 * holder paid for them, so there is no honest profit figure to show.
 *
 * Spans every epoch still held, not only the current one — a settled epoch's
 * row stays exactly where it was, with a Redeem action, until its tokens are
 * actually burned for USDC. Nothing disappears just because the epoch rolled.
 */
function PositionsTable({
  market,
  epochPositions,
  onRedeem,
  loading,
}: {
  market: Market;
  epochPositions: EpochPosition[];
  onRedeem: (epochId: bigint, isLong: boolean, amount: number) => Promise<void>;
  loading: boolean;
}) {
  const [redeemingKey, setRedeemingKey] = useState<string | null>(null);
  const rows = toRows(epochPositions, market);

  if (rows.length === 0) {
    return (
      <p className="text-t3 text-bone-3 m-0 p-s4">
        {loading ? "Loading your positions…" : "No open position on this pool yet."}
      </p>
    );
  }

  async function handleRedeem(row: PositionRow) {
    setRedeemingKey(row.key);
    try {
      await onRedeem(row.epochId, row.isLong, row.size);
    } finally {
      setRedeemingKey(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[680px]">
        <thead>
          <tr>
            {["Epoch", "Side", "Size", "Status", "Price", "Value", ""].map((h) => (
              <th key={h} scope="col" className={TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const tone = r.isLong ? "text-up" : "text-down";
            const redeeming = redeemingKey === r.key;
            return (
              <tr key={r.key} className="border-t border-hair-2">
                <td className={cn(TD, "num text-bone-2")}>#{r.epochId.toString()}</td>
                <td className={cn(TD, "num font-medium", tone)}>{r.side}</td>
                <td className={cn(TD, "num")}>
                  {r.status === "Redeemed" ? "—" : `${int(r.size)} ${r.side}`}
                </td>
                <td className={cn(TD, STATUS_TONE[r.status])}>{r.status}</td>
                <td className={cn(TD, "num")}>{r.status === "Awaiting settlement" ? "—" : `$${dec(r.price, 4)}`}</td>
                <td className={cn(TD, "num")}>
                  {r.status === "Awaiting settlement"
                    ? "—"
                    : r.status === "Redeemed"
                      ? `+${usdc(r.value)} USDC`
                      : `${usdc(r.value)} USDC`}
                </td>
                <td className={cn(TD, "text-right")}>
                  {r.redeemable ? (
                    <button
                      type="button"
                      disabled={redeeming}
                      onClick={() => handleRedeem(r)}
                      className="px-s3 py-s1 text-t2 font-medium bg-up/15 border border-up text-up hover:bg-up/25 transition-colors duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {redeeming ? "Redeeming…" : `Redeem $${dec(r.value, 2)}`}
                    </button>
                  ) : r.status === "Active" ? (
                    <span className="text-t2 text-bone-3">Trading</span>
                  ) : r.status === "Redeemed" ? (
                    <span className="text-t2 text-bone-3">Closed</span>
                  ) : (
                    <span className="text-t2 text-bone-3">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({
  trades,
  openId,
  onToggle,
  loading,
}: {
  trades: Trade[];
  openId: string | null;
  onToggle: (id: string | null) => void;
  loading: boolean;
}) {
  if (!trades.length) {
    return (
      <p className="text-t3 text-bone-3 m-0 p-s4">
        {loading ? "Loading your trade history…" : "No trades on this pool yet."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[520px]">
        <thead>
          <tr>
            {["Side", "Tokens", "Time", ""].map((h, i) => (
              <th key={h || i} scope="col" className={TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const open = openId === t.id;
            const sideLabel = t.side === "long" ? "LONG" : "SHORT";
            const tone = t.side === "long" ? "text-up" : "text-down";
            return (
              <Fragment key={t.id}>
                <tr
                  onClick={() => onToggle(open ? null : t.id)}
                  aria-expanded={open}
                  className="vx-row border-t border-hair-2 cursor-pointer"
                >
                  <td className={cn(TD, "num font-medium", tone)}>{sideLabel}</td>
                  <td className={cn(TD, "num")}>
                    {int(t.tokens)} {sideLabel}
                  </td>
                  <td className={cn(TD, "num text-bone-2")}>{agoSeconds(t.timestamp, MOCK_NOW)}</td>
                  <td className={cn(TD, "text-right text-bone-3")}>
                    <span
                      aria-hidden="true"
                      className={cn("inline-block transition-transform duration-[140ms]", open && "rotate-180")}
                    >
                      ⌄
                    </span>
                  </td>
                </tr>
                {open ? (
                  <tr className="bg-ink-2">
                    <td colSpan={4} className="px-s4 py-s3">
                      <div className="flex flex-wrap gap-s6 gap-y-s2 text-t2">
                        <span className="text-bone-3">
                          Paid <span className="num text-bone-2">{dec(t.usdcAmount, 2)} USDC</span>
                        </span>
                        <span className="text-bone-3">
                          Price <span className="num text-bone-2">${dec(t.price, 2)}</span>
                        </span>
                        <span className="text-bone-3">
                          Filled{" "}
                          <span className="num text-bone-2">{agoSeconds(t.timestamp, MOCK_NOW)}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
