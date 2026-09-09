export type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/** One executed swap in the variance pool: the price it left behind, and its size. */
export type Trade = {
  time: number; // unix seconds
  price: number; // VAR-LONG in mUSDC, 0–1
  volume: number; // mUSDC that changed hands
};

export type Timeframe = "1H" | "4H" | "1D" | "1W";

export const TIMEFRAMES: Timeframe[] = ["1H", "4H", "1D", "1W"];

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "1H": 3600,
  "4H": 4 * 3600,
  "1D": 24 * 3600,
  "1W": 7 * 24 * 3600,
};

/**
 * OHLCV for the LONG token, bucketed from the pool's own swaps.
 *
 * This used to synthesize 140 bars from a seeded random walk anchored to the
 * current price. It now returns only what actually traded, which means an
 * epoch with no swaps yet produces no candles — an empty chart is the honest
 * rendering of a market nobody has traded, and the chart says so rather than
 * drawing a plausible history that never happened.
 */
export function buildCandles(trades: Trade[], timeframe: Timeframe): Candle[] {
  if (trades.length === 0) return [];

  const step = TIMEFRAME_SECONDS[timeframe];
  const buckets = new Map<number, Trade[]>();

  for (const t of trades) {
    const bucket = Math.floor(t.time / step) * step;
    const list = buckets.get(bucket);
    if (list) list.push(t);
    else buckets.set(bucket, [t]);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, group]) => {
      const prices = group.map((g) => g.price);
      return {
        time,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
        volume: group.reduce((sum, g) => sum + g.volume, 0),
      };
    });
}

/** A simple moving average over closes, aligned to the same index as `candles`. */
export function sma(candles: Candle[], period: number): Array<{ time: number; value: number }> {
  const out: Array<{ time: number; value: number }> = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}
