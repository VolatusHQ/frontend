/**
 * Trailing volatility samples, from the `roller` backend service's
 * `/vol-history` endpoint (`backend/services/roller/src/server.ts`) — the
 * one place this data is recorded, since nothing on chain keeps a history
 * and Feature B's severity score needs a per-pool trailing series to
 * percentile-rank against (see `onchain/severity.ts`'s module doc for why a
 * fixed global scale would be dishonest here).
 *
 * `NEXT_PUBLIC_ROLLER_URL` unset, or the roller unreachable, both degrade to
 * `null` — never a guessed severity. The roller may not be deployed yet, or
 * may be a free-tier instance that has spun down; either way this must not
 * break the page it's called from.
 */

import { computeVolSeverity, type VolSeverity } from "./onchain/severity";

interface RollerVolSample {
  ts: number;
  impliedVolWad: string;
  realizedVolWad: string;
  dataSufficient: boolean;
  spreadWad: string | null;
}

export async function getVolSeverity(poolId: `0x${string}`): Promise<VolSeverity | null> {
  const base = process.env.NEXT_PUBLIC_ROLLER_URL;
  if (!base) return null;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/vol-history?poolId=${poolId}`, {
      next: { revalidate: 15 },
      // A cold Render free-tier instance can take 30-50s+ to wake up. Without
      // its own timeout this fetch just waits — for the whole duration, on
      // every ISR regeneration attempt — which is long enough to hit Vercel's
      // own function timeout and kill the *entire* page's render, leaving it
      // permanently stuck serving a stale cache rather than the graceful null
      // this module's own doc promises. 5s is generous for a warm roller and
      // short enough to never be the thing that takes the page down.
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { samples: RollerVolSample[] };
    if (!data.samples || data.samples.length === 0) return null;

    const latest = data.samples[data.samples.length - 1];
    return computeVolSeverity({
      currentImpliedVolWad: BigInt(latest.impliedVolWad),
      trailingImpliedVolWad: data.samples.map((s) => BigInt(s.impliedVolWad)),
      spreadWad: latest.spreadWad === null ? null : BigInt(latest.spreadWad),
      dataSufficient: latest.dataSufficient,
    });
  } catch {
    return null;
  }
}
