import { PageHead } from "../components/volatus/AppShell";
import { LiquidityPositionsTable } from "../components/volatus/LiquidityPositionsTable";
import { RealLiquidityCallout } from "../components/volatus/RealLiquidityCallout";

/**
 * The LP's portfolio of existing Uniswap liquidity. Its job is to surface
 * the position that needs attention — where the capital is, how big, how
 * much it has earned, how volatile the pool is, and whether it is already
 * protected — then get out of the way. Rows navigate to the pool page.
 */
export default function LiquidityPage() {
  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <PageHead
        title="Liquidity"
        lede="The liquidity you provide on Uniswap is exposed to volatility. Open a position to see how exposed it is and protect it."
      />
      <RealLiquidityCallout />

      <div className="flex flex-col gap-s4">
        <span className="lbl">Your positions</span>
        <LiquidityPositionsTable />
      </div>
    </div>
  );
}
