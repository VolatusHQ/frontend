"use client";

import { useEffect, useState } from "react";
import { poolDisplay } from "@/app/app/lib/market-data";
import { useLiquidity } from "@/app/app/lib/liquidity-context";
import { useMarket } from "@/app/app/lib/market-context";
import { REAL_POOL } from "@/app/app/lib/live-market";
import { errorMessage } from "@/app/app/lib/onchain/writes";
import { dec, int, pct, rate, usdc } from "@/app/app/lib/format";
import { Breadcrumb } from "./AppShell";
import { Plate, Stat } from "./Stat";
import { AddLiquidityDialog } from "./AddLiquidityDialog";

/**
 * The real pool's liquidity detail — a deliberately simpler page than the
 * four mock pools get. Those lean on `liquidity-data.ts`'s hand-authored
 * per-pool numbers (downside scenarios, a premium-per-second constant) for
 * `PoolConditions`/`MarketPositioning`/`LpRiskEstimate`/`ActiveProtection` —
 * none of which have an honest equivalent here, and `ActiveProtection`
 * specifically ticks its elapsed-time display off `MOCK_NOW`, a frozen
 * constant, which would show a wrong (likely negative) duration against a
 * real subscription's real `startedAt`. Rather than force real numbers
 * through components built to invent them, this shows only what's actually
 * real: the position, real market conditions, and the two write paths
 * (`addLiquidity`, `start`/`stop`) `liquidity-context.tsx` already wires to
 * real contracts. The premium preview mirrors `SigmaStream`'s own rate
 * formula (notional / 100,000 per second) instead of a per-pool constant, so
 * it agrees with what the contract will actually charge.
 */

function useElapsedSeconds(startedAt: number): number {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.floor(Date.now() / 1000) - startedAt));
  useEffect(() => {
    const id = window.setInterval(
      () => setElapsed(Math.max(0, Math.floor(Date.now() / 1000) - startedAt)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

function elapsedLabel(total: number): string {
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3_600);
  const m = Math.floor((total % 3_600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function RealLiquidityDetail() {
  const { market } = useMarket();
  const { positions, protection, start, stop, addLiquidity, ready } = useLiquidity();
  const position = positions[REAL_POOL.slug];
  const active = protection[REAL_POOL.slug];

  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [protectAmount, setProtectAmount] = useState(10);

  async function run(label: string, action: () => Promise<void>) {
    if (!ready) {
      setFailed(true);
      setStatus("Connect a wallet first.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setFailed(false);
    setStatus(label);
    try {
      await action();
      setStatus("Confirmed.");
    } catch (e) {
      setFailed(true);
      setStatus(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const previewRate = protectAmount > 0 ? Math.max(protectAmount / 100_000, 0.000001) : 0;

  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <div className="flex flex-col gap-s3">
        <Breadcrumb trail={[{ label: "Liquidity", href: "/app/liquidity" }, { label: poolDisplay(REAL_POOL) }]} />
        <h1 className="font-serif text-d3 font-medium leading-[1.12] tracking-[-0.012em] m-0">
          {poolDisplay(REAL_POOL)}
        </h1>
        <p className="text-t3 text-bone-2 m-0 max-w-[60ch]">
          Reads live chain state on Unichain Sepolia + Arc Testnet, not mock data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] gap-s6 items-start">
        <div className="min-w-0 flex flex-col gap-s6">
          <Plate className="p-s4 flex flex-col gap-s4">
            <span className="lbl">Your position</span>
            {position ? (
              <div className="flex flex-wrap gap-x-s6 gap-y-s4">
                <Stat layout="value-first" size="lg" label="Value" value={`$${usdc(position.valueUsd)}`} />
              </div>
            ) : (
              <p className="text-t3 text-bone-3 m-0">
                No liquidity in this pool yet — add some below to open a position.
              </p>
            )}
            <div className="flex">
              <AddLiquidityDialog onAdd={(usd) => run(`Adding $${usd} liquidity…`, () => addLiquidity(REAL_POOL.slug, usd))} />
            </div>
          </Plate>

          {market ? (
            <Plate className="p-s4 flex flex-col gap-s4">
              <span className="lbl">Pool conditions</span>
              <div className="flex flex-wrap gap-x-s6 gap-y-s4">
                <Stat layout="value-first" label="Implied vol" value={pct(market.impliedVol)} />
                <Stat layout="value-first" label="Realized vol" value={pct(market.realizedVol)} />
                <Stat layout="value-first" label="Liquidity" value={`$${int(market.liquidityUsd)}`} />
              </div>
            </Plate>
          ) : null}
        </div>

        <aside className="flex flex-col gap-s4 min-w-0 lg:sticky lg:top-s4">
          <Plate className="p-s4 flex flex-col gap-s4">
            {active ? (
              <>
                <div className="flex items-baseline justify-between gap-s4">
                  <span className="lbl">Protection</span>
                  <span className="num text-t3 text-bone flex items-center gap-s2">
                    <span aria-hidden="true" className="text-violet">●</span>
                    Active
                  </span>
                </div>
                <ActiveReadout active={active} onStop={() => run("Stopping protection…", () => stop(REAL_POOL.slug))} busy={busy} />
              </>
            ) : (
              <>
                <span className="lbl">Protect your liquidity</span>
                <label className="flex flex-col gap-s1">
                  <span className="lbl">Coverage (USDC)</span>
                  <input
                    type="number"
                    min={0}
                    value={protectAmount}
                    onChange={(e) => setProtectAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="border border-hair px-s3 py-s2 text-t4 num bg-transparent"
                  />
                </label>
                <span className="text-t2 text-bone-3 num">
                  ≈ {rate(previewRate)} USDC/sec — matches SigmaStream's own rate formula
                </span>
                <button
                  type="button"
                  disabled={protectAmount <= 0 || busy}
                  onClick={() => run("Starting protection…", () => start(REAL_POOL.slug, protectAmount))}
                  className="bg-pink text-ink px-s4 py-s3 text-t3 text-center font-medium hover:opacity-90 transition-opacity duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {busy ? "Confirm in wallet…" : "Start protection"}
                </button>
                <span className="text-t2 text-bone-3">Payments stream via Arc Testnet.</span>
              </>
            )}
          </Plate>
          {status ? (
            <p className={`text-t2 m-0 ${failed ? "text-down" : "text-bone-2"}`}>{status}</p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ActiveReadout({
  active,
  onStop,
  busy,
}: {
  active: { protectedUsd: number; startedAt: number; premiumPerSec: number };
  onStop: () => void;
  busy: boolean;
}) {
  const elapsed = useElapsedSeconds(active.startedAt);
  const spent = active.premiumPerSec * elapsed;

  return (
    <div className="ruled pt-s4 flex flex-col gap-s4">
      <Stat layout="value-first" size="lg" label="Protected" value={`$${int(active.protectedUsd)}`} />
      <Stat
        layout="value-first"
        label="Premium"
        value={<>{rate(active.premiumPerSec)} <span className="text-t3 text-bone-2">USDC / sec</span></>}
      />
      <Stat layout="value-first" label="Spent so far" value={`$${dec(spent, 4)}`} />
      <Stat layout="value-first" label="Active for" value={elapsedLabel(elapsed)} />
      <button
        type="button"
        disabled={busy}
        onClick={onStop}
        className="text-t3 text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms] self-start disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Stop protection
      </button>
    </div>
  );
}
