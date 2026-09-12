"use client";

import { useLiquidity } from "../../lib/liquidity-context";
import { usePositions } from "../../lib/positions-context";
import { useMarket } from "../../lib/market-context";
import { useSponsorship } from "../../lib/sponsorship-context";
import { lpRows, summarize } from "../../lib/portfolio";
import { buildSupportTrail } from "../../lib/underwrite-data";
import { dec, int } from "../../lib/format";
import { Block, Stat } from "../../components/volatus/Stat";
import { PortfolioTrendChart } from "../../components/volatus/PortfolioTrendChart";
import { LpPortfolioTable } from "../../components/volatus/LpPortfolioTable";

export default function ProfileLiquidityPage() {
  const { markets } = useMarket();
  const { positions: lpPositions, protection } = useLiquidity();
  const { positions } = usePositions();
  const { sponsorships } = useSponsorship();

  const rows = lpRows({ lpPositions, protection, markets });
  const summary = summarize({ positions, lpPositions, protection, sponsorships, markets });
  const totalLiquidity = rows.reduce((a, r) => a + r.valueUsd, 0);
  const protectedTotal = rows.reduce((a, r) => a + r.protectedUsd, 0);

  return (
    <>
      <div className="flex flex-wrap gap-x-s6 gap-y-s4">
        <Stat
          layout="value-first"
          size="lg"
          label="Total liquidity"
          value={`$${int(totalLiquidity)}`}
        />
        <Stat
          layout="value-first"
          size="lg"
          label="Fees earned"
          ink="realized"
          value={`+$${int(summary.feesEarnedUsd)}`}
        />
        <Stat layout="value-first" size="lg" label="Protected" value={`$${int(protectedTotal)}`} />
        <Stat
          layout="value-first"
          size="lg"
          label="Premiums paid"
          value={`$${dec(summary.premiumsPaidUsd, 2)}`}
        />
      </div>

      <Block title="LP value" aside={`+$${int(summary.feesEarnedUsd)} in fees to date`}>
        <PortfolioTrendChart
          points={buildSupportTrail("lp-value", totalLiquidity)}
          label="LP value"
          height={120}
          format={(n) => `$${int(n)}`}
        />
      </Block>

      <div className="flex flex-col gap-s4">
        <span className="lbl">Positions</span>
        <LpPortfolioTable rows={rows} />
      </div>
    </>
  );
}
