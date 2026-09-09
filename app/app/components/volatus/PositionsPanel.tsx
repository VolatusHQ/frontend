"use client";

import { Fragment, useState } from "react";
import type { Market, PoolSlug } from "@/app/app/lib/market-data";
import type { Position, Trade } from "@/app/app/lib/positions-context";
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
}: {
  slug: PoolSlug;
  market: Market;
  position: Position | undefined;
  trades: Trade[];
}) {
  const poolTrades = trades.filter((t) => t.slug === slug);
  const [tab, setTab] = useState<Tab>(position ? "positions" : "history");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="rounded-[16px] border border-hair bg-panel overflow-hidden">
      <div className="flex border-b border-hair">
        <TabButton active={tab === "positions"} onClick={() => setTab("positions")}>
          Positions
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          History{poolTrades.length ? ` (${poolTrades.length})` : ""}
        </TabButton>
      </div>

      {tab === "positions" ? (
        <PositionsTable market={market} position={position} />
      ) : (
        <HistoryTable trades={poolTrades} openId={openId} onToggle={setOpenId} />
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

/**
 * Holdings, not P/L. Entry price and cost basis were dropped when this moved
 * on chain: the vault records balances, and nothing anywhere records what a
 * holder paid for them, so there is no honest profit figure to show.
 */
function PositionsTable({ market, position }: { market: Market; position: Position | undefined }) {
  if (!position || (position.longSize === 0 && position.shortSize === 0)) {
    return <p className="text-t3 text-bone-3 m-0 p-s4">No open position on this pool yet.</p>;
  }

  const rows = [
    { side: "LONG", size: position.longSize, price: market.longPrice, tone: "text-up" },
    { side: "SHORT", size: position.shortSize, price: market.shortPrice, tone: "text-down" },
  ].filter((r) => r.size > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[560px]">
        <thead>
          <tr>
            {["Side", "Size", "Price", "Value"].map((h) => (
              <th key={h} scope="col" className={TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.side} className="border-t border-hair-2">
              <td className={cn(TD, "num font-medium", r.tone)}>{r.side}</td>
              <td className={cn(TD, "num")}>
                {int(r.size)} {r.side}
              </td>
              <td className={cn(TD, "num")}>${dec(r.price, 4)}</td>
              <td className={cn(TD, "num")}>{usdc(r.size * r.price)} USDC</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({
  trades,
  openId,
  onToggle,
}: {
  trades: Trade[];
  openId: string | null;
  onToggle: (id: string | null) => void;
}) {
  if (!trades.length) {
    return <p className="text-t3 text-bone-3 m-0 p-s4">No trades on this pool yet.</p>;
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
