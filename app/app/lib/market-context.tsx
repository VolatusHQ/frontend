"use client";

import { createContext, useContext } from "react";
import type { Market, PoolSlug } from "./market-data";

/**
 * The live market, read once on the server in the layout and handed to every
 * client screen.
 *
 * `market-data.ts` used to be a module constant any component could import
 * synchronously. A chain read cannot be, so this context takes its place —
 * same data, same shape, fetched once per request instead of hard-coded.
 */

type Ctx = {
  market: Market | null;
  markets: Partial<Record<PoolSlug, Market>>;
};

const MarketContext = createContext<Ctx>({ market: null, markets: {} });

export function MarketProvider({
  market,
  children,
}: {
  market: Market | null;
  children: React.ReactNode;
}) {
  const markets = market ? { [market.pool.slug]: market } : {};
  return <MarketContext.Provider value={{ market, markets }}>{children}</MarketContext.Provider>;
}

export function useMarket(): Ctx {
  return useContext(MarketContext);
}
