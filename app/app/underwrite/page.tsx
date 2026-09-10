import { PageHead } from "../components/volatus/AppShell";
import { UnderwriteTable } from "../components/volatus/UnderwriteTable";
import { getLiveUnderwritePool } from "../lib/live-market";

export const revalidate = 15;

export default async function UnderwritePage() {
  const pool = await getLiveUnderwritePool();
  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <PageHead
        title="Underwrite"
        lede="Sponsor liquidity protection. Fund protection for LPs in a pool and help keep its liquidity deep."
      />
      {pool ? (
        <UnderwriteTable pools={[pool]} />
      ) : (
        <p className="text-t3 text-bone-2 m-0">
          No epoch is open, so there is no coverage to back.
        </p>
      )}
    </div>
  );
}
