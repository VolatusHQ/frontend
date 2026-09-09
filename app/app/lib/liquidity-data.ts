/**
 * Local mock data for the Liquidity experience — the LP's own capital and
 * the parameters used to turn pool conditions into a risk figure and a
 * streaming premium. No backend, no chain, no wallet: every value here is
 * hand-authored or a pure derivation of one.
 *
 * Components consume `LpPosition` / `LiquidityParams` shapes rather than
 * inventing numbers, so a real wallet/indexer can replace this file later
 * without touching a single component — same contract as `market-data.ts`.
 */

import { MARKETS, type Market, type PoolSlug } from "./market-data";

export type ActivityLevel = "Low" | "Moderate" | "High";

/** A position the connected wallet already holds in a Uniswap pool. */
export type LpPosition = {
  slug: PoolSlug;
  valueUsd: number; // current position value
  feesEarnedUsd: number; // fees earned to date
  /**
   * Whether this wallet created / owns the pool, as opposed to only
   * providing liquidity in it. A minimal flag — the pool-owner experience
   * is out of scope here; this only lets the header acknowledge the role.
   */
  isOwner: boolean;
};

/**
 * Per-pool parameters that drive the two derived figures on the Liquidity
 * page: the estimated-downside scenario band and the streaming premium.
 * Deterministic and hand-tuned; a pricing engine replaces this later.
 */
export type LiquidityParams = {
  slug: PoolSlug;
  activity: ActivityLevel;
  /**
   * Estimated adverse move on the whole position, as a fraction of position
   * value, under three volatility regimes. Presented as a scenario, never
   * as a prediction.
   */
  downsideLowerPct: number;
  downsideCurrentPct: number;
  downsideHigherPct: number;
  /** Streaming premium per second, per 1 USDC of coverage. */
  premiumPerSecPerUsdc: number;
};

/**
 * Three seed positions, matching the discovery-table example in the brief.
 * `sol-usdc` is intentionally absent — its detail route is still reachable
 * and renders the "no liquidity in this pool" state.
 */
export const LP_POSITIONS: LpPosition[] = [
  { slug: "eth-usdc", valueUsd: 84_200, feesEarnedUsd: 1_842, isOwner: false },
  { slug: "btc-usdc", valueUsd: 31_800, feesEarnedUsd: 920, isOwner: true },
  { slug: "eth-usdt", valueUsd: 12_400, feesEarnedUsd: 318, isOwner: false },
];

export const LIQUIDITY_PARAMS: Record<PoolSlug, LiquidityParams> = {
  "eth-usdc": {
    slug: "eth-usdc",
    activity: "High",
    downsideLowerPct: 0.0226,
    downsideCurrentPct: 0.0499,
    downsideHigherPct: 0.0926,
    premiumPerSecPerUsdc: 8.4e-10,
  },
  "btc-usdc": {
    slug: "btc-usdc",
    activity: "High",
    downsideLowerPct: 0.031,
    downsideCurrentPct: 0.064,
    downsideHigherPct: 0.118,
    premiumPerSecPerUsdc: 1.15e-9,
  },
  "eth-usdt": {
    slug: "eth-usdt",
    activity: "Moderate",
    downsideLowerPct: 0.019,
    downsideCurrentPct: 0.041,
    downsideHigherPct: 0.078,
    premiumPerSecPerUsdc: 6.8e-10,
  },
  "sol-usdc": {
    slug: "sol-usdc",
    activity: "High",
    downsideLowerPct: 0.042,
    downsideCurrentPct: 0.087,
    downsideHigherPct: 0.163,
    premiumPerSecPerUsdc: 1.7e-9,
  },
};

export function getLpPosition(slug: string): LpPosition | undefined {
  return LP_POSITIONS.find((p) => p.slug === slug);
}

export function getLiquidityParams(slug: string): LiquidityParams | undefined {
  return LIQUIDITY_PARAMS[slug as PoolSlug];
}

/** Share of the volatility market currently positioned LONG (higher vol). */
export function longShare(market: Market): number {
  return market.longPrice;
}

export function marketLeaning(market: Market): "Higher volatility" | "Lower volatility" {
  return longShare(market) >= 0.5 ? "Higher volatility" : "Lower volatility";
}

/** Fraction of the position that a given coverage amount protects. */
export function coveragePct(protectedUsd: number, positionUsd: number): number {
  if (positionUsd <= 0) return 0;
  return Math.min(1, Math.max(0, protectedUsd / positionUsd));
}

/**
 * The continuous premium, in USDC per second. Linear in the covered
 * notional; the per-pool rate carries the pool's volatility. This is the
 * figure the UI leads with — the payment is a stream, not a purchase.
 */
export function premiumPerSec(protectedUsd: number, params: LiquidityParams): number {
  return Math.max(0, protectedUsd) * params.premiumPerSecPerUsdc;
}

/**
 * The estimated-downside scenario band, in USD (negative). Scaled to the
 * whole position — "how bad could this reasonably be for my LP position" —
 * not to the coverage amount.
 */
export function downsideBand(positionUsd: number, params: LiquidityParams) {
  return {
    lower: -positionUsd * params.downsideLowerPct,
    current: -positionUsd * params.downsideCurrentPct,
    higher: -positionUsd * params.downsideHigherPct,
  };
}

/** Convenience: the market row for a slug, or undefined. */
export function marketFor(slug: string): Market | undefined {
  return MARKETS[slug as PoolSlug];
}
