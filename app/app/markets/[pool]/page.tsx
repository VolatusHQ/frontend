import { notFound } from "next/navigation";
import { getLiveMarket, getVarLongTrades } from "../../lib/live-market";
import { MarketDetail } from "../../components/volatus/MarketDetail";

export const revalidate = 15;

/**
 * Server shell: the market comes from the chain, the interactive parts stay
 * client-side. Split only so the read can be awaited — the page renders the
 * same components in the same arrangement as before.
 */
export default async function MarketDetailPage({ params }: { params: Promise<{ pool: string }> }) {
  const { pool: slug } = await params;
  const [market, trades] = await Promise.all([getLiveMarket(), getVarLongTrades()]);
  if (!market || market.pool.slug !== slug) notFound();

  return <MarketDetail market={market} swaps={trades} />;
}
