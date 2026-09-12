/**
 * Local mock market data for the Markets experience. No backend, no chain
 * calls — every figure here is a hand-authored or deterministically derived
 * dummy value. Components consume `Pool`/`Market` shapes rather than
 * inventing numbers, so a real data source can replace this file later
 * without touching a single component.
 */

/**
 * A fixed point, not Date.now() — every "how long ago" figure in the app
 * (candle timeframes, trade history) is computed relative to this, not the
 * real clock, so seed data renders identically on the server and the
 * client. A trade made live during the session is stamped with this same
 * constant too, which is why a fresh trade reads as "just now": there is no
 * simulated passage of time within one visit.
 */
export const MOCK_NOW = 1_788_500_000; // unix seconds

/**
 * Widened from a fixed union to a string when the real pool arrived: the
 * chain's pool is `mweth-musdc`, and the four names below are prototype
 * fixtures that the Markets surface no longer reads. See `live-market.ts`.
 */
export type PoolSlug = string;

export type Pool = {
  slug: PoolSlug;
  base: string;
  quote: string;
};

/**
 * The one place "ETH / USDC" gets built. Every component calls this instead
 * of concatenating strings, so token order and spacing can never drift.
 */
export function poolDisplay(pool: Pool): string {
  return `${pool.base} / ${pool.quote}`;
}

export type VolatilityPoint = { t: number; realized: number; implied: number };

export type EpochState = {
  index: number;
  remainingSeconds: number;
  /** Live markets only; mock markets are always shown as Active. */
  status?: "Active" | "Frozen" | "Settled";
};

export type Market = {
  pool: Pool;
  impliedVol: number;
  impliedVolChangePp: number;
  realizedVol: number;
  expectedVol: number;
  longPrice: number;
  shortPrice: number;
  liquidityUsd: number;
  volumeUsd: number;
  epoch: EpochState;
  history: VolatilityPoint[];
};

/**
 * Deterministic PRNG (mulberry32). A market's history must render
 * identically on the server and the client, so nothing in this file may
 * call Math.random() or Date.now().
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildHistory(
  seed: number,
  endRealized: number,
  endImplied: number,
  points = 48,
): VolatilityPoint[] {
  const rand = mulberry32(seed);
  let r = endRealized * (0.75 + rand() * 0.1);
  let i = endImplied * (0.8 + rand() * 0.1);
  const out: VolatilityPoint[] = [];
  for (let t = 0; t < points; t++) {
    const pull = t / (points - 1);
    r += (endRealized - r) * (0.06 + pull * 0.05) + (rand() - 0.5) * 0.006;
    i += (endImplied - i) * (0.06 + pull * 0.05) + (rand() - 0.5) * 0.006;
    r = Math.max(0.02, r);
    i = Math.max(0.02, i);
    out.push({ t, realized: r, implied: i });
  }
  // The chart's last point and the header's headline figures must agree.
  out[out.length - 1] = { t: points - 1, realized: endRealized, implied: endImplied };
  return out;
}

type Seed = Omit<Market, "history"> & { seed: number };

const SEEDS: Seed[] = [
  {
    pool: { slug: "eth-usdc", base: "ETH", quote: "USDC" },
    seed: 1,
    impliedVol: 0.246,
    impliedVolChangePp: 2.4,
    realizedVol: 0.228,
    expectedVol: 0.246,
    longPrice: 0.61,
    shortPrice: 0.39,
    liquidityUsd: 42_800_000,
    volumeUsd: 2_400_000,
    epoch: { index: 4, remainingSeconds: 1122 }, // 18:42
  },
  {
    pool: { slug: "btc-usdc", base: "BTC", quote: "USDC" },
    seed: 2,
    impliedVol: 0.312,
    impliedVolChangePp: -1.8,
    realizedVol: 0.334,
    expectedVol: 0.312,
    longPrice: 0.44,
    shortPrice: 0.56,
    liquidityUsd: 61_500_000,
    volumeUsd: 5_100_000,
    epoch: { index: 7, remainingSeconds: 642 }, // 10:42
  },
  {
    pool: { slug: "eth-usdt", base: "ETH", quote: "USDT" },
    seed: 3,
    impliedVol: 0.201,
    impliedVolChangePp: 0.6,
    realizedVol: 0.196,
    expectedVol: 0.201,
    longPrice: 0.52,
    shortPrice: 0.48,
    liquidityUsd: 18_200_000,
    volumeUsd: 940_000,
    epoch: { index: 2, remainingSeconds: 2578 }, // 42:58
  },
  {
    pool: { slug: "sol-usdc", base: "SOL", quote: "USDC" },
    seed: 4,
    impliedVol: 0.415,
    impliedVolChangePp: 5.1,
    realizedVol: 0.379,
    expectedVol: 0.415,
    longPrice: 0.58,
    shortPrice: 0.42,
    liquidityUsd: 9_600_000,
    volumeUsd: 1_150_000,
    epoch: { index: 1, remainingSeconds: 118 }, // 1:58
  },
];

export const MARKETS: Record<PoolSlug, Market> = Object.fromEntries(
  SEEDS.map(({ seed, ...m }) => [m.pool.slug, { ...m, history: buildHistory(seed, m.realizedVol, m.impliedVol) }]),
) as Record<PoolSlug, Market>;

export const POOLS: Pool[] = SEEDS.map((s) => s.pool);

export function getMarket(slug: string): Market | undefined {
  return MARKETS[slug as PoolSlug];
}
