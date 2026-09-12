import { notFound } from "next/navigation";
import { getLiveMarket, getVarLongTrades, MEASURED_POOL_ID } from "../../lib/live-market";
import { getVolSeverity } from "../../lib/vol-history";
import { MarketDetail } from "../../components/volatus/MarketDetail";

export const revalidate = 15;

/**
 * Server shell: the market comes from the chain, the interactive parts stay
 * client-side. Split only so the read can be awaited — the page renders the
 * same components in the same arrangement as before.
 */
export default async function MarketDetailPage({ params }: { params: Promise<{ pool: string }> }) {
  const { pool: slug } = await params;
  const [market, trades, severity] = await Promise.all([
    getLiveMarket(),
    getVarLongTrades(),
    getVolSeverity(MEASURED_POOL_ID),
  ]);
  if (!market || market.pool.slug !== slug) notFound();

  return <MarketDetail market={market} swaps={trades} severity={severity} />;
}
