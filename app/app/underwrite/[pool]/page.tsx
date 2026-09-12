import { notFound } from "next/navigation";
import { getLiveUnderwritePool } from "../../lib/live-market";
import { getVolSeverity } from "../../lib/vol-history";
import { MEASURED_POOL_ID } from "../../lib/onchain/addresses";
import { UnderwriteDetail } from "../../components/volatus/UnderwriteDetail";

export const revalidate = 15;

/**
 * Server shell, same split as `markets/[pool]/page.tsx`: the pool comes from
 * the chain, matched against the requested slug — never a keyed lookup into
 * mock data, which is what left this page 404ing for the only pool that
 * actually exists (`getLiveUnderwritePool()` returns `"mweth-musdc"`, the
 * old `getUnderwritePool(slug)` only knew the four mock prototype slugs).
 */
export default async function UnderwritePoolDetailPage({ params }: { params: Promise<{ pool: string }> }) {
  const { pool: slug } = await params;
  const [pool, severity] = await Promise.all([getLiveUnderwritePool(), getVolSeverity(MEASURED_POOL_ID)]);
  if (!pool || pool.slug !== slug) notFound();

  return <UnderwriteDetail pool={pool} severity={severity} />;
}
