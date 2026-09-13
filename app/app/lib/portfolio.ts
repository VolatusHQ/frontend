/**
 * Profile aggregation. Every figure the Profile experience shows is derived
 * here, live, from the three domain contexts (`usePositions`,
 * `useLiquidity`, `useSponsorship`) and the existing `*-data.ts` modules —
 * there is no Profile seed data, and nothing here is fabricated. Functions
 * take the context values as arguments (the same shape as
 * `liquidity-data.ts`'s pure derivations), so a real indexer replaces the
 * contexts without touching this file.
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

/**
 * `MARKETS` only carries the four mock prototype pools — the real pool
 * (`REAL_POOL.slug`, "mweth-musdc") isn't in it, same gap `sponsorshipRows`
 * already documents. `trades` now includes real, chain-derived rows for that
 * pool (see `wallet-trades.ts`), so a bare `MARKETS[t.slug]` lookup crashes
 * the moment a real trade exists. `markets` (the live context) is checked
 * first and is where the real pool actually lives; a trade whose pool is in
 * neither map is dropped rather than crashing on it.
 */
export function tradeHistoryRows(
  trades: Trade[],
  markets: Partial<Record<PoolSlug, Market>> = {},
): TradeHistoryRow[] {
  return trades
    .map((t) => {
      const market = markets[t.slug] ?? MARKETS[t.slug];
      if (!market) return null;
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
    })
    .filter((r): r is TradeHistoryRow => r !== null);
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

/** Same `MARKETS[slug]` gap as `tradeHistoryRows` — a real LP position on
 *  `REAL_POOL.slug` isn't in the mock `MARKETS` map, so `markets` (the live
 *  context) is checked first. */
export function lpRows(input: {
  lpPositions: LpPositions;
  protection: Protections;
  markets?: Partial<Record<PoolSlug, Market>>;
}): LpRow[] {
  const markets = input.markets ?? {};
  return (Object.values(input.lpPositions).filter(Boolean) as LpPosition[])
    .map((p) => {
      const market = markets[p.slug] ?? MARKETS[p.slug];
      if (!market) return null;
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
    .filter((r): r is LpRow => r !== null)
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
  /** The real pool's live market, keyed the same way `MARKETS` is — see
   *  `tradeHistoryRows`'s doc for why a bare `MARKETS[slug]` lookup isn't
   *  enough once real trades exist. */
  markets?: Partial<Record<PoolSlug, Market>>;
}): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  const markets = input.markets ?? {};

  for (const t of input.trades) {
    const pool = markets[t.slug]?.pool ?? MARKETS[t.slug]?.pool;
    if (!pool) continue;
    out.push({
      id: `trade-${t.id}`,
      kind: "trading",
      action: t.side === "long" ? "Bought LONG" : "Bought SHORT",
      slug: t.slug,
      pool,
      amountUsd: -t.usdcAmount,
      timestamp: t.timestamp,
    });
  }

  for (const [slug, prot] of Object.entries(input.protection) as [PoolSlug, ProtectionState | undefined][]) {
    if (!prot) continue;
    // Same real-pool gap as the trade loop above — a live protection on
    // REAL_POOL.slug isn't in the mock MARKETS map either.
    const pool = markets[slug]?.pool ?? MARKETS[slug]?.pool;
    if (!pool) continue;
    out.push({
      id: `protection-${slug}`,
      kind: "liquidity",
      action: "Protection started",
      slug,
      pool,
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
  markets?: Partial<Record<PoolSlug, Market>>;
}): AttentionItem[] {
  const markets = input.markets ?? {};
  const out: AttentionItem[] = [];
  for (const p of Object.values(input.lpPositions).filter(Boolean) as LpPosition[]) {
    const market = markets[p.slug] ?? MARKETS[p.slug];
    if (!market) continue;
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

