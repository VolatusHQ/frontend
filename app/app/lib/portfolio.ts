/**
 * Profile aggregation. Every figure the Profile experience shows is derived
 * here, live, from the three domain contexts (`usePositions`,
 * `useLiquidity`, `useSponsorship`) and the existing `*-data.ts` modules —
 * there is no Profile seed data. Functions take the context values as
 * arguments (the same shape as `liquidity-data.ts`'s pure derivations), so a
 * real indexer replaces the contexts without touching this file.
 *
 * The one generated series here — `buildPortfolioTrail` — is deterministic
 * decoration around a live endpoint: its last point is always the real
 * current total. Same technique as `market-data.ts` `buildHistory`.
 */

import {
  MARKETS,
  MOCK_NOW,
  type Pool,
  type PoolSlug,
} from "./market-data";
import { coveragePct, type LpPosition } from "./liquidity-data";
import type { ProtectionState } from "./liquidity-context";
import type { Position, Side, Trade } from "./positions-context";
import type { Market } from "./market-data";
import type { Sponsorship } from "./sponsorship-context";
import { estimateLiquiditySupported, UNDERWRITE_POOLS } from "./underwrite-data";
import { REAL_POOL } from "./live-market";
import { int, pct } from "./format";

/* ---------- timeframes ---------- */

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "ALL";
export const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "ALL"];

/* ---------- portfolio summary ---------- */

export type PortfolioSummary = {
  portfolioValueUsd: number;
  totalPnlUsd: number;
  lpValueUsd: number;
  tradingExposureUsd: number;
  underwritingUsd: number;
  unrealizedPnlUsd: number;
  realizedPnlUsd: number;
  feesEarnedUsd: number;
  premiumsPaidUsd: number;
  openPositionCount: number;
};

type Positions = Partial<Record<PoolSlug, Position>>;
type LpPositions = Partial<Record<PoolSlug, LpPosition>>;
type Protections = Partial<Record<PoolSlug, ProtectionState>>;
type Sponsorships = Partial<Record<PoolSlug, Sponsorship>>;

/** Premium streamed to date on a running protection, in USDC. */
function premiumSpent(prot: ProtectionState): number {
  return prot.premiumPerSec * Math.max(0, MOCK_NOW - prot.startedAt);
}

export function summarize(input: {
  positions: Positions;
  lpPositions: LpPositions;
  protection: Protections;
  sponsorships: Sponsorships;
  markets: Partial<Record<PoolSlug, Market>>;
}): PortfolioSummary {
  const trades = openTradeRows({ positions: input.positions, markets: input.markets });
  const tradingExposureUsd = trades.reduce((a, r) => a + r.valueUsd, 0);
  // No cost basis exists on chain, so there is no unrealized figure to report.
  const unrealizedPnlUsd = 0;

  const lp = Object.values(input.lpPositions).filter(Boolean) as LpPosition[];
  const lpValueUsd = lp.reduce((a, p) => a + p.valueUsd, 0);
  const feesEarnedUsd = lp.reduce((a, p) => a + p.feesEarnedUsd, 0);

  const premiumsPaidUsd = (Object.values(input.protection).filter(Boolean) as ProtectionState[]).reduce(
    (a, prot) => a + premiumSpent(prot),
    0,
  );

  const underwritingUsd = (Object.values(input.sponsorships).filter(Boolean) as Sponsorship[]).reduce(
    (a, s) => a + s.capitalUsd,
    0,
  );

  const realizedPnlUsd = 0; // the prototype has no position closes
  const totalPnlUsd = unrealizedPnlUsd + feesEarnedUsd - premiumsPaidUsd;

  return {
    portfolioValueUsd: lpValueUsd + tradingExposureUsd + underwritingUsd,
    totalPnlUsd,
    lpValueUsd,
    tradingExposureUsd,
    underwritingUsd,
    unrealizedPnlUsd,
    realizedPnlUsd,
    feesEarnedUsd,
    premiumsPaidUsd,
    openPositionCount: trades.length,
  };
}

/* ---------- trading ---------- */

/**
 * A leg held, and what it is worth at the current price.
 *
 * Entry price and P/L are gone: the vault records balances and nothing
 * records what a holder paid, so there is no cost basis to subtract.
 */
export type OpenTradeRow = {
  slug: PoolSlug;
  pool: Pool;
  side: Side;
  size: number;
  currentPrice: number;
  valueUsd: number;
};

export function openTradeRows(input: {
  positions: Positions;
  markets: Partial<Record<PoolSlug, Market>>;
}): OpenTradeRow[] {
  return (Object.entries(input.positions) as [PoolSlug, Position | undefined][])
    .filter((e): e is [PoolSlug, Position] => e[1] !== undefined)
    .flatMap(([slug, position]) => {
      const market = input.markets[slug];
      if (!market) return [];
      const legs: Array<{ side: Side; size: number; price: number }> = [
        { side: "long", size: position.longSize, price: market.longPrice },
        { side: "short", size: position.shortSize, price: market.shortPrice },
      ];
      return legs
        .filter((l) => l.size > 0)
        .map((l) => ({
          slug,
          pool: market.pool,
          side: l.side,
          size: l.size,
          currentPrice: l.price,
          valueUsd: l.size * l.price,
        }));
    })
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

export type TradeHistoryRow = {
  id: string;
  slug: PoolSlug;
  pool: Pool;
  side: Side;
  tokens: number;
  price: number;
  usdcAmount: number;
  markPrice: number;
  pnlToDateUsd: number;
  timestamp: number;
};

export function tradeHistoryRows(trades: Trade[]): TradeHistoryRow[] {
  return trades.map((t) => {
    const market = MARKETS[t.slug];
    const markPrice = t.side === "long" ? market.longPrice : market.shortPrice;
    return {
      id: t.id,
      slug: t.slug,
      pool: market.pool,
      side: t.side,
      tokens: t.tokens,
      price: t.price,
      usdcAmount: t.usdcAmount,
      markPrice,
      pnlToDateUsd: t.tokens * (markPrice - t.price),
      timestamp: t.timestamp,
    };
  });
}

/* ---------- liquidity ---------- */

export type LpRow = {
  slug: PoolSlug;
  pool: Pool;
  valueUsd: number;
  feesUsd: number;
  impliedVol: number;
  realizedVol: number;
  protectedUsd: number;
  coverage: number;
  premiumPerDayUsd: number;
};

export function lpRows(input: { lpPositions: LpPositions; protection: Protections }): LpRow[] {
  return (Object.values(input.lpPositions).filter(Boolean) as LpPosition[])
    .map((p) => {
      const market = MARKETS[p.slug];
      const prot = input.protection[p.slug];
      const protectedUsd = prot?.protectedUsd ?? 0;
      return {
        slug: p.slug,
        pool: market.pool,
        valueUsd: p.valueUsd,
        feesUsd: p.feesEarnedUsd,
        impliedVol: market.impliedVol,
        realizedVol: market.realizedVol,
        protectedUsd,
        coverage: coveragePct(protectedUsd, p.valueUsd),
        premiumPerDayUsd: (prot?.premiumPerSec ?? 0) * 86_400,
      };
    })
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

/* ---------- underwriting ---------- */

export type SponsorshipRow = {
  slug: PoolSlug;
  pool: Pool;
  capitalUsd: number;
  supportedUsd: number;
  impactMultiple: number;
  startedAt: number;
  status: "Active";
};

/**
 * `UNDERWRITE_POOLS` only carries the four mock prototype pools — the real
 * pool (`REAL_POOL.slug`, "mweth-musdc") isn't in it, since its impact
 * multiple isn't modeled on chain (see `live-market.ts`). A row for it is
 * built with `pool` from `REAL_POOL` and `impactMultiple`/`supportedUsd` at
 * `0` rather than crashing on an undefined lookup or fabricating a multiple
 * that does not exist.
 */
export function sponsorshipRows(input: { sponsorships: Sponsorships }): SponsorshipRow[] {
  return (Object.values(input.sponsorships).filter(Boolean) as Sponsorship[])
    .map((s) => {
      const up = UNDERWRITE_POOLS[s.slug];
      const pool = up?.pool ?? (s.slug === REAL_POOL.slug ? REAL_POOL : null);
      if (!pool) return null;
      const impactMultiple = up?.impactMultiple ?? 0;
      return {
        slug: s.slug,
        pool,
        capitalUsd: s.capitalUsd,
        supportedUsd: estimateLiquiditySupported(s.capitalUsd, impactMultiple),
        impactMultiple,
        startedAt: s.startedAt ?? 0,
        status: "Active" as const,
      };
    })
    .filter((r): r is SponsorshipRow => r !== null)
    .sort((a, b) => b.capitalUsd - a.capitalUsd);
}

/* ---------- unified activity ledger ---------- */

export type ActivityKind = "trading" | "liquidity" | "underwriting";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  action: string;
  slug: PoolSlug;
  pool: Pool;
  /** Negative = capital left the wallet. Omitted when `note` carries the detail. */
  amountUsd?: number;
  note?: string;
  timestamp: number;
};

export function buildActivityLedger(input: {
  trades: Trade[];
  protection: Protections;
  sponsorships: Sponsorships;
}): ActivityEntry[] {
  const out: ActivityEntry[] = [];

  for (const t of input.trades) {
    out.push({
      id: `trade-${t.id}`,
      kind: "trading",
      action: t.side === "long" ? "Bought LONG" : "Bought SHORT",
      slug: t.slug,
      pool: MARKETS[t.slug].pool,
      amountUsd: -t.usdcAmount,
      timestamp: t.timestamp,
    });
  }

  for (const [slug, prot] of Object.entries(input.protection) as [PoolSlug, ProtectionState | undefined][]) {
    if (!prot) continue;
    out.push({
      id: `protection-${slug}`,
      kind: "liquidity",
      action: "Protection started",
      slug,
      pool: MARKETS[slug].pool,
      note: `$${int(prot.protectedUsd)} coverage`,
      timestamp: prot.startedAt,
    });
  }

  for (const [slug, s] of Object.entries(input.sponsorships) as [PoolSlug, Sponsorship | undefined][]) {
    if (!s) continue;
    // `MARKETS` only carries the four mock prototype pools -- the real pool
    // (REAL_POOL.slug) isn't in it. See `sponsorshipRows`'s doc above.
    const pool = MARKETS[slug]?.pool ?? (slug === REAL_POOL.slug ? REAL_POOL : null);
    if (!pool) continue;
    out.push({
      id: `sponsorship-${slug}`,
      kind: "underwriting",
      action: "Sponsored pool",
      slug,
      pool,
      amountUsd: -s.capitalUsd,
      timestamp: s.startedAt ?? 0,
    });
  }

  return out.sort((a, b) => b.timestamp - a.timestamp);
}

/* ---------- needs attention (derived, never invented) ---------- */

export type AttentionItem = {
  slug: PoolSlug;
  pool: Pool;
  metricLabel: string;
  metricValue: string;
  reason: string;
  actionLabel: string;
  actionHref: string;
};

export function needsAttention(input: {
  lpPositions: LpPositions;
  protection: Protections;
}): AttentionItem[] {
  const out: AttentionItem[] = [];
  for (const p of Object.values(input.lpPositions).filter(Boolean) as LpPosition[]) {
    const market = MARKETS[p.slug];
    const protectedUsd = input.protection[p.slug]?.protectedUsd ?? 0;
    const coverage = coveragePct(protectedUsd, p.valueUsd);
    if (coverage < 0.6 && market.impliedVolChangePp > 0) {
      out.push({
        slug: p.slug,
        pool: market.pool,
        metricLabel: "Protection coverage",
        metricValue: pct(coverage, 0),
        reason:
          protectedUsd <= 0
            ? "Not protected while volatility is rising."
            : "Coverage is thin while volatility is rising.",
        actionLabel: "Review protection",
        actionHref: `/app/liquidity/${p.slug}`,
      });
    }
  }
  return out;
}

/* ---------- performance trail ---------- */

/* Deterministic PRNG + string-keyed seed, re-declared per lib per the
   codebase convention (see market-data.ts, underwrite-data.ts) so this file
   carries its own "no Math.random / no Date.now" contract. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const TRAIL_POINTS: Record<Timeframe, number> = { "1D": 26, "1W": 28, "1M": 30, "3M": 46, ALL: 60 };
const TRAIL_START: Record<Timeframe, number> = { "1D": 0.991, "1W": 0.972, "1M": 0.936, "3M": 0.86, ALL: 0.61 };
const TRAIL_NOISE: Record<Timeframe, number> = { "1D": 0.0016, "1W": 0.004, "1M": 0.006, "3M": 0.009, ALL: 0.013 };

/**
 * A backward-looking portfolio-value walk for the Overview chart. The last
 * point is pinned to `endValueUsd` (the live total), so the chart endpoint
 * and the headline figure always agree. Shorter timeframes start closer to
 * the end and move less — the effect is a zoom, not a different history.
 */
export function buildPortfolioTrail(endValueUsd: number, timeframe: Timeframe): number[] {
  const points = TRAIL_POINTS[timeframe];
  if (points < 2 || !Number.isFinite(endValueUsd) || endValueUsd <= 0) return [];
  const rand = mulberry32(hashSeed(`portfolio:${timeframe}:${Math.round(endValueUsd)}`));
  let v = endValueUsd * (TRAIL_START[timeframe] + rand() * 0.006);
  const noise = endValueUsd * TRAIL_NOISE[timeframe];
  const out: number[] = [];
  for (let t = 0; t < points; t++) {
    const pull = t / (points - 1);
    v += (endValueUsd - v) * (0.045 + pull * 0.05) + (rand() - 0.5) * noise;
    v = Math.max(endValueUsd * 0.4, v);
    out.push(v);
  }
  out[out.length - 1] = endValueUsd;
  return out;
}

/**
 * A cumulative-P&L walk for the subordinate Trading chart. Unlike the
 * portfolio trail it may cross zero, so nothing is floored.
 */
export function buildPnlTrail(endValueUsd: number, points = 40): number[] {
  if (points < 2 || !Number.isFinite(endValueUsd)) return [];
  const rand = mulberry32(hashSeed(`pnl:${points}:${Math.round(endValueUsd)}`));
  const amp = Math.max(Math.abs(endValueUsd), 40);
  let v = endValueUsd * 0.15 + (rand() - 0.5) * amp * 0.2;
  const out: number[] = [];
  for (let t = 0; t < points; t++) {
    const pull = t / (points - 1);
    v += (endValueUsd - v) * (0.05 + pull * 0.06) + (rand() - 0.5) * amp * 0.05;
    out.push(v);
  }
  out[out.length - 1] = endValueUsd;
  return out;
}
