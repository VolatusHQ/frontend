/**
 * Formatters. Every number on screen goes through one of these, so a value
 * cannot be formatted two ways on two screens.
 *
 * All of them are locale-independent on purpose: `toLocaleString` with the
 * browser's locale is a classic source of hydration mismatch, because the
 * server and the client do not always agree on it.
 */

const groups = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** 1284996 -> "1,284,996" */
export function int(n: number): string {
  const neg = n < 0;
  const s = groups(Math.abs(Math.round(n)).toString());
  return neg ? `-${s}` : s;
}

/** 1284.102 -> "1,284.10" */
export function dec(n: number, places = 2): string {
  const neg = n < 0;
  const a = Math.abs(n);
  const whole = Math.floor(a);
  const frac = a - whole;
  const fs = frac.toFixed(places).slice(2);
  const s = places > 0 ? `${groups(whole.toString())}.${fs}` : groups(whole.toString());
  return neg ? `-${s}` : s;
}

/** A vol ratio to a percent string. 0.684 -> "68.4%" */
export function pct(ratio: number, places = 1): string {
  return `${(ratio * 100).toFixed(places)}%`;
}

/** Signed points of vol. 13.3 -> "+13.3" */
export function signed(n: number, places = 1): string {
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(places)}`;
}

/** USDC with the precision the magnitude deserves. */
export function usdc(n: number): string {
  const a = Math.abs(n);
  if (a >= 1000) return dec(n, 0);
  if (a >= 1) return dec(n, 2);
  if (a >= 0.01) return dec(n, 4);
  return dec(n, 6);
}

/** A sub-cent per-second rate, which needs every digit it has. */
export function rate(perSecond: number): string {
  return perSecond.toFixed(6);
}

/**
 * A per-second rate in three units at once.
 *
 * A rate like 0.000042 USDC/s is unreadable as a quantity — nobody knows
 * whether that is a lot. Showing per-second, per-hour and a projected total
 * together is what makes it legible, and it is a requirement, not a nicety.
 */
export function rateUnits(perSecond: number, blocksRemaining: number) {
  return {
    perSecond: rate(perSecond),
    perHour: dec(perSecond * 3600, 3),
    perDay: dec(perSecond * 86400, 2),
    // Unichain blocks are ~1s, so blocks remaining is seconds remaining.
    // usdc() rather than a fixed 2dp: late in an epoch the projection is a
    // few thousandths, and "0.00" reads as broken rather than as small.
    projected: usdc(perSecond * blocksRemaining),
  };
}

/** Blocks to a human duration. Unichain is ~1s per block. */
export function blocksToTime(blocks: number): string {
  if (blocks <= 0) return "ended";
  if (blocks < 60) return `${blocks}s`;
  const m = Math.floor(blocks / 60);
  const s = blocks % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** 0x7a4e280b… -> "0x7a4e…6d55" */
export function addr(a: string): string {
  return a.length <= 12 ? a : `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** How long ago, in blocks. */
export function ago(block: number, now: number): string {
  const d = now - block;
  if (d <= 0) return "this block";
  if (d === 1) return "1 block ago";
  return `${int(d)} blocks ago`;
}

/** Seconds to "m:ss". 1122 -> "18:42" */
export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

/** A dollar figure at the precision its magnitude deserves. 42800000 -> "$42.8M" */
export function compactUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${dec(n, 2)}`;
}

/**
 * How long ago, in wall-clock seconds. Both arguments are unix seconds —
 * pass `MOCK_NOW` as `now` for anything seeded, so it never depends on the
 * real clock. A trade made live during the session can use its own
 * MOCK_NOW-stamped timestamp against the same constant, which is why it
 * reads as "just now".
 */
export function agoSeconds(timestamp: number, now: number): string {
  const d = Math.max(0, now - timestamp);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * A calendar label for an activity ledger: "Today" / "Yesterday" / "Sep 1".
 * Both arguments are unix seconds; the day boundary is UTC so the output is
 * locale-independent and stable across server and client — pass `MOCK_NOW`
 * as `now` for seeded data.
 */
export function dayLabel(timestamp: number, now: number): string {
  const dayOf = (t: number) => Math.floor(t / 86400);
  const delta = dayOf(now) - dayOf(timestamp);
  if (delta <= 0) return "Today";
  if (delta === 1) return "Yesterday";
  const d = new Date(timestamp * 1000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Seconds to a UTC "HH:MM" clock label. 1_788_500_000 -> "13:33" */
export function hhmm(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}`;
}
