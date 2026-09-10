/**
 * Local mock data for the Underwrite experience — the figures a liquidity
 * sponsor needs before deciding whether funding protection in a pool is
 * worth the money: how much liquidity the pool holds, how much is already
 * protected, how much is still exposed, and how far a sponsorship budget
 * can reach.
 *
 * No backend, no chain, no wallet. Every value here is hand-authored or a
 * pure derivation of one, and components consume the `UnderwritePool` shape
 * rather than inventing numbers — a real indexer replaces this file later
 * without touching a component. Same contract as `market-data.ts` and
 * `liquidity-data.ts`.
 */

import { MARKETS, type Pool, type PoolSlug } from "./market-data";

export type Opportunity = "Moderate" | "High" | "Very high";

/**
 * Hand-tuned per-pool inputs. `impactMultiple` — dollars of LP liquidity a
 * sponsorship helps keep in the pool per $1 of protection funded — is the
 * number the whole page turns on; it is a mock constant here, not a pricing
 * model. Values are chosen so ETH / USDC reproduces the worked example the
 * product brief uses: ~$8.2M protected, ~$34.6M exposed, 15×, $5,000 suggested.
 */
export type UnderwriteSeed = {
  slug: PoolSlug;
  protectedShare: number; // fraction of pool liquidity already protected
  impactMultiple: number; // $ of LP liquidity supported per $1 sponsored
  suggestedSponsorshipUsd: number; // illustrative starting amount
  sponsorCount: number; // flavour: sponsors currently backing this pool
};

export type UnderwritePool = {
  slug: PoolSlug;
  pool: Pool;
  liquidityUsd: number;
  impliedVol: number; // "current volatility"
  realizedVol: number;
  volumeUsd: number;
  protectedUsd: number;
  unprotectedUsd: number;
  protectedShare: number;
  impactMultiple: number;
  suggestedSponsorshipUsd: number;
  sponsorCount: number;
  opportunity: Opportunity;
};

const SEEDS: UnderwriteSeed[] = [
  { slug: "eth-usdc", protectedShare: 0.191, impactMultiple: 15, suggestedSponsorshipUsd: 5_000, sponsorCount: 7 },
  { slug: "btc-usdc", protectedShare: 0.144, impactMultiple: 12, suggestedSponsorshipUsd: 7_500, sponsorCount: 5 },
  { slug: "eth-usdt", protectedShare: 0.223, impactMultiple: 18, suggestedSponsorshipUsd: 3_000, sponsorCount: 4 },
  { slug: "sol-usdc", protectedShare: 0.041, impactMultiple: 9, suggestedSponsorshipUsd: 1_500, sponsorCount: 2 },
];

/**
 * The sponsorship opportunity rating. More exposed liquidity and higher
 * volatility both raise it. Deterministic and deliberately coarse — a prompt
 * to look closer, not a score to optimise.
 */
export function opportunityOf(protectedShare: number, impliedVol: number): Opportunity {
  const score = (1 - protectedShare) * 0.6 + impliedVol;
  if (score < 0.7) return "Moderate";
  if (score < 0.9) return "High";
  return "Very high";
}

function build(seed: UnderwriteSeed): UnderwritePool {
  const market = MARKETS[seed.slug];
  const protectedUsd = Math.round(market.liquidityUsd * seed.protectedShare);
  return {
    slug: seed.slug,
    pool: market.pool,
    liquidityUsd: market.liquidityUsd,
    impliedVol: market.impliedVol,
    realizedVol: market.realizedVol,
    volumeUsd: market.volumeUsd,
    protectedUsd,
    unprotectedUsd: market.liquidityUsd - protectedUsd,
    protectedShare: seed.protectedShare,
    impactMultiple: seed.impactMultiple,
    suggestedSponsorshipUsd: seed.suggestedSponsorshipUsd,
    sponsorCount: seed.sponsorCount,
    opportunity: opportunityOf(seed.protectedShare, market.impliedVol),
  };
}

export const UNDERWRITE_POOLS: Record<PoolSlug, UnderwritePool> = Object.fromEntries(
  SEEDS.map((s) => [s.slug, build(s)]),
) as Record<PoolSlug, UnderwritePool>;

export function getUnderwritePool(slug: string): UnderwritePool | undefined {
  return UNDERWRITE_POOLS[slug as PoolSlug];
}

/**
 * The one "amount → consequence" calculation on the page: sponsorship
 * capital to the LP liquidity it can help support. Mirrors `trade.ts`'s
 * `estimateTokens` — guard non-finite / non-positive input, then a single
 * deterministic expression, rounded down so an estimate never promises more
 * than the real thing would.
 */
export function estimateLiquiditySupported(capitalUsd: number, impactMultiple: number): number {
  if (!Number.isFinite(capitalUsd) || !Number.isFinite(impactMultiple) || capitalUsd <= 0) return 0;
  return Math.floor(capitalUsd * impactMultiple);
}

export const SPONSOR_QUICK_AMOUNTS = [1_000, 5_000, 10_000, 25_000] as const;

/* Deterministic PRNG + string-keyed seed, re-declared here rather than
   shared — the codebase keeps one copy per lib (see market-data.ts,
   candles.ts) so each carries its own "no Math.random / no Date.now" contract. */
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

/**
 * A backward-looking series for the active sponsorship's "liquidity
 * supported" line — a seeded mean-reverting walk whose last point is pinned
 * to `endValue`, so the line and the headline figure always agree. There is
 * no simulated passage of time in the mock, so this is illustrative history,
 * not a live feed.
 */
export function buildSupportTrail(slug: string, endValue: number, points = 40): number[] {
  if (!Number.isFinite(endValue) || endValue <= 0) return [];
  const rand = mulberry32(hashSeed(`${slug}:support`));
  let v = endValue * (0.45 + rand() * 0.2);
  const out: number[] = [];
  for (let t = 0; t < points; t++) {
    const pull = t / (points - 1);
    v += (endValue - v) * (0.05 + pull * 0.06) + (rand() - 0.5) * endValue * 0.03;
    v = Math.max(0, v);
    out.push(v);
  }
  out[out.length - 1] = endValue;
  return out;
}
