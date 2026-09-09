import { parseAbiItem } from "viem";
import { LIVE_EPOCH_ID, MEASURED_POOL_ID, POOL_MANAGER, USDC_DECIMALS } from "./onchain/addresses";
import { unichainClient } from "./onchain/clients";
import { readMarket, readStream } from "./onchain/reads";
import { wadToRatio } from "./onchain/units";
import { varLongPrice } from "./onchain/v4";
import type { Trade } from "./candles";
import type { Market, Pool, VolatilityPoint } from "./market-data";

/**
 * The real market, in the shape the existing components already consume.
 *
 * This is the seam `market-data.ts` was written for: components take a
 * `Market`, so replacing the source does not touch a single one of them.
 *
 * Fields with no on-chain source are left at zero rather than invented, and
 * the components render them as an empty figure. Specifically:
 *
 *  - `impliedVolChangePp` — the chain stores the current price, not a prior
 *    one. A change needs two points in time, and only the vol pool's own swap
 *    history has them; until this epoch has swaps there is nothing to diff.
 *  - `history` — the same problem. The hook has emitted five observations in
 *    its lifetime, all in the previous epoch, so a series drawn now would be
 *    a line through no data.
 */

export const REAL_POOL: Pool = { slug: "mweth-musdc", base: "mWETH", quote: "mUSDC" };

const SWAP_EVENT = parseAbiItem(
  "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)",
);

/**
 * mUSDC traded in the variance pool since the epoch opened.
 *
 * Bounded by the epoch's own start block, so this is a small scan and a real
 * figure rather than a rolling window the chain cannot answer for.
 */
async function volumeSinceEpochStart(volPoolId: `0x${string}`, fromBlock: bigint): Promise<number> {
  try {
    const logs = await unichainClient.getLogs({
      address: POOL_MANAGER,
      event: SWAP_EVENT,
      args: { id: volPoolId },
      fromBlock,
      toBlock: "latest",
    });

    // mUSDC is currency0 in the vol pool; the absolute delta is what changed hands.
    const total = logs.reduce((sum, log) => {
      const a0 = log.args.amount0 ?? 0n;
      return sum + (a0 < 0n ? -a0 : a0);
    }, 0n);

    return Number(total) / 10 ** USDC_DECIMALS;
  } catch {
    return 0;
  }
}

/**
 * Every swap in this epoch's variance pool, as price-and-size points.
 *
 * The price comes from the `sqrtPriceX96` each swap left behind, converted the
 * same way the oracle converts it, so the chart and the oracle cannot disagree.
 * Bounded by the epoch's start block — a small scan, and the only window that
 * means anything, since each epoch has its own pool and its own legs.
 */
export async function getVarLongTrades(): Promise<Trade[]> {
  const m = await readMarket();
  if (!m.ok || !m.epoch || !m.volPool) return [];

  try {
    const logs = await unichainClient.getLogs({
      address: POOL_MANAGER,
      event: SWAP_EVENT,
      args: { id: m.volPool.poolId },
      fromBlock: m.epoch.startBlock,
      toBlock: "latest",
    });
    if (logs.length === 0) return [];

    // Timestamps come from the blocks the swaps landed in, deduped so a busy
    // block is fetched once.
    const blocks = [...new Set(logs.map((l) => l.blockNumber))];
    const times = new Map<bigint, number>();
    await Promise.all(
      blocks.map(async (b) => {
        const block = await unichainClient.getBlock({ blockNumber: b });
        times.set(b, Number(block.timestamp));
      }),
    );

    const longIsCurrency0 = m.volPool.longIsCurrency0;
    return logs
      .map((log) => {
        const sqrtPriceX96 = log.args.sqrtPriceX96 ?? 0n;
        const a0 = log.args.amount0 ?? 0n;
        return {
          time: times.get(log.blockNumber) ?? 0,
          price: varLongPrice(sqrtPriceX96, longIsCurrency0),
          volume: Number(a0 < 0n ? -a0 : a0) / 10 ** USDC_DECIMALS,
        };
      })
      .filter((t) => t.time > 0)
      .sort((a, b) => a.time - b.time);
  } catch {
    return [];
  }
}

/** The epoch's legs and pool orientation, for the client write paths. */
export async function getEpochLegs() {
  const m = await readMarket();
  if (!m.ok || !m.epoch) return null;
  return {
    slug: REAL_POOL.slug,
    epochId: m.epoch.id.toString(),
    longToken: m.epoch.longToken,
    shortToken: m.epoch.shortToken,
    longIsCurrency0: m.volPool?.longIsCurrency0 ?? false,
    hasVolPool: m.volPool !== null,
  };
}

export async function getLiveMarket(): Promise<Market | null> {
  const m = await readMarket();
  if (!m.ok || !m.epoch) return null;

  const impliedVol = m.impliedVolWad === null ? 0 : wadToRatio(m.impliedVolWad);
  const realizedVol = m.realizedVolWad === null ? 0 : wadToRatio(m.realizedVolWad);
  const longPrice = m.varLongPriceWad === null ? 0 : wadToRatio(m.varLongPriceWad);

  const volumeUsd = m.volPool
    ? await volumeSinceEpochStart(m.volPool.poolId, m.epoch.startBlock)
    : 0;

  const history: VolatilityPoint[] = [];

  return {
    pool: REAL_POOL,
    impliedVol,
    // No prior point on chain to difference against — see the note above.
    impliedVolChangePp: 0,
    realizedVol,
    expectedVol: impliedVol,
    longPrice,
    // The invariant the vault enforces: a long plus a short is one unit.
    shortPrice: longPrice === 0 ? 0 : 1 - longPrice,
    // Collateral actually locked in this epoch, which is the money in this
    // market. The v4 pool's own `liquidity` is an L value, not a dollar figure.
    liquidityUsd: Number(m.epoch.collateralHeld) / 10 ** USDC_DECIMALS,
    volumeUsd,
    epoch: {
      index: Number(m.epoch.id),
      // Unichain is ~1s per block, so blocks remaining is seconds remaining.
      remainingSeconds: Number(m.blocksRemaining),
    },
    history,
  };
}

export { MEASURED_POOL_ID };

/**
 * The underwriting view of the same market: what capacity actually backs
 * coverage, read from `SigmaStream` on Arc.
 *
 * The prototype's impact multiple, sponsor count and protected/unprotected
 * split are not modelled anywhere on chain, so they are zero here and the
 * columns that showed them were dropped.
 */
export async function getLiveUnderwritePool() {
  const [market, stream] = await Promise.all([getLiveMarket(), readStream(LIVE_EPOCH_ID)]);
  if (!market) return null;

  const capacityUsd = stream.ok ? Number(stream.capacityPoolUsdc) / 10 ** USDC_DECIMALS : 0;

  return {
    slug: market.pool.slug,
    pool: market.pool,
    liquidityUsd: capacityUsd,
    impliedVol: market.impliedVol,
    realizedVol: market.realizedVol,
    volumeUsd: market.volumeUsd,
    protectedUsd: 0,
    unprotectedUsd: 0,
    protectedShare: 0,
    impactMultiple: 0,
    suggestedSponsorshipUsd: 0,
    sponsorCount: 0,
    opportunity: "Moderate" as const,
  };
}
