"use client";

/**
 * Live trades (and, incidentally, the market signal) pushed from the
 * roller's `/live` WebSocket (`backend/services/roller/src/live.ts`), so a
 * market page updates as swaps land instead of only on the next reload or
 * ISR revalidation (`markets/[pool]/page.tsx`'s `revalidate = 15` is a
 * server-side cache window, not a push to the browser).
 *
 * Reuses `NEXT_PUBLIC_ROLLER_URL` — already set for `vol-history.ts`'s
 * `/vol-history` fetch — rather than a second env var, just swapping the
 * scheme (`http(s)` → `ws(s)`). Unset, or a socket that never connects, both
 * degrade to exactly the static server-rendered view: same "never break the
 * page over this" posture as `vol-history.ts`.
 */

import { useRef, useState, useEffect } from "react";
import type { Trade } from "./candles";

type LiveEvent =
  | { type: "epoch"; epochId: string | null; poolId: string | null }
  | { type: "trade"; time: number; price: number; volume: number }
  | { type: "market"; impliedVolWad: string; realizedVolWad: string; dataSufficient: boolean };

export interface LiveMarketSignal {
  impliedVolWad: bigint;
  realizedVolWad: bigint;
  dataSufficient: boolean;
}

function liveUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_ROLLER_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "").replace(/^http/, "ws")}/live`;
}

/**
 * `initialTrades` (this epoch's history, read server-side) seeds the state
 * once; live trades are appended to it from there. Deliberately does *not*
 * re-sync if the caller passes a new `initialTrades` array later (e.g. after
 * a post-Buy `router.refresh()`) — the socket already covers that: the same
 * swap the refresh would fetch arrives over `/live` within one poll interval
 * anyway, and reacting to every prop change here would risk double-counting
 * a trade that lands in both. Callers that need a hard reset (see below)
 * should remount this hook instead of asking it to resync.
 *
 * An `epoch` event reporting a different id than the one this hook has seen
 * means the vol pool changed underneath the page (the epoch rolled) and
 * clears the accumulated trades — a new epoch has no history, the same rule
 * `getVarLongTrades()` follows server-side. This covers a roll that happens
 * while the page is open. A roll that happened *before* this component ever
 * mounted (e.g. the tab sat on a stale page and got reloaded) is instead
 * handled by the caller keying its component on the epoch index, so a
 * genuinely new epoch gets a fresh mount rather than a resync — see
 * `MarketDetail`'s call site.
 */
export function useLiveMarket(initialTrades: Trade[]): {
  trades: Trade[];
  signal: LiveMarketSignal | null;
  connected: boolean;
} {
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [signal, setSignal] = useState<LiveMarketSignal | null>(null);
  const [connected, setConnected] = useState(false);
  // `undefined` = no `epoch` event seen yet this connection. Distinct from
  // `null` ("seen, and there's genuinely no active epoch") for the same
  // reason `live.ts`'s own `epochKnown` flag exists server-side.
  const knownEpochId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const url = liveUrl();
    if (!url) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByUs = false;

    function connect(): void {
      socket = new WebSocket(url!);

      socket.onopen = () => setConnected(true);

      socket.onclose = () => {
        setConnected(false);
        // The roller is a single free-tier Render instance -- worth retrying
        // rather than giving up, but not so eagerly that a dead deploy gets
        // hammered.
        if (!closedByUs) reconnectTimer = setTimeout(connect, 3000);
      };

      socket.onerror = () => socket?.close();

      socket.onmessage = (ev) => {
        let event: LiveEvent;
        try {
          event = JSON.parse(ev.data as string);
        } catch {
          return; // not a message this hook understands; ignore rather than throw
        }

        if (event.type === "epoch") {
          if (knownEpochId.current !== undefined && knownEpochId.current !== event.epochId) {
            setTrades([]);
            setSignal(null);
          }
          knownEpochId.current = event.epochId;
        } else if (event.type === "trade") {
          setTrades((prev) => [...prev, { time: event.time, price: event.price, volume: event.volume }]);
        } else if (event.type === "market") {
          setSignal({
            impliedVolWad: BigInt(event.impliedVolWad),
            realizedVolWad: BigInt(event.realizedVolWad),
            dataSufficient: event.dataSufficient,
          });
        }
      };
    }

    connect();
    return () => {
      closedByUs = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  return { trades, signal, connected };
}
