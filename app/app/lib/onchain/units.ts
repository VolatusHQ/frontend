/**
 * Chain scales to plain JS numbers, so display goes through `lib/format.ts`
 * like every other figure in the app.
 *
 * The conversion is the whole point of this file existing: WAD (1e18) and 6dp
 * USDC are different scales that both look like "a big integer", and mixing
 * them produces a plausible wrong number rather than an error.
 */

import { USDC_DECIMALS } from "./addresses";

/**
 * WAD to the ratio `pct()` expects. `1e18` is 100%, so `9.229e18` becomes
 * `9.229` and renders as "922.9%".
 *
 * Number() loses precision above 2^53, which for a volatility figure is
 * irrelevant — nothing is settled off this value, it is only drawn.
 */
export function wadToRatio(wad: bigint): number {
  return Number(wad) / 1e18;
}

/** 6dp USDC to a dollar number. `3002200n` becomes `3.0022`. */
export function usdcToNumber(value: bigint): number {
  return Number(value) / 10 ** USDC_DECIMALS;
}

/** Seconds to a compact duration. `853200n` -> "9d 21h". */
export function duration(seconds: bigint): string {
  const s = seconds < 0n ? 0n : seconds;
  const d = s / 86_400n;
  const h = (s % 86_400n) / 3_600n;
  const m = (s % 3_600n) / 60n;
  if (d > 0n) return `${d}d ${h}h`;
  if (h > 0n) return `${h}h ${m}m`;
  if (m > 0n) return `${m}m ${s % 60n}s`;
  return `${s}s`;
}

/** Blocks to a rough duration. Unichain is ~1s per block. */
export function blocksToDuration(blocks: bigint): string {
  return duration(blocks < 0n ? 0n : blocks);
}
