"use client";

import { useSponsorship } from "../../lib/sponsorship-context";
import { sponsorshipRows } from "../../lib/portfolio";
import { buildSupportTrail } from "../../lib/underwrite-data";
import { dec, int } from "../../lib/format";
import { Block, Stat } from "../../components/volatus/Stat";
import { PortfolioTrendChart } from "../../components/volatus/PortfolioTrendChart";
import { ImpactFlow } from "../../components/volatus/ImpactFlow";
import { SponsorshipPortfolioTable } from "../../components/volatus/SponsorshipPortfolioTable";

export default function ProfileUnderwritingPage() {
  const { sponsorships } = useSponsorship();

  const rows = sponsorshipRows({ sponsorships });
  const capital = rows.reduce((a, r) => a + r.capitalUsd, 0);
  const supported = rows.reduce((a, r) => a + r.supportedUsd, 0);
  const multiple = capital > 0 ? supported / capital : 0;

  return (
    <>
      <div className="flex flex-wrap gap-x-s6 gap-y-s4">
        <Stat layout="value-first" size="lg" label="Capital committed" value={`$${int(capital)}`} />
        <Stat
          layout="value-first"
          size="lg"
          label="Liquidity supported"
          value={`~$${int(supported)}`}
        />
        <Stat
          layout="value-first"
          size="lg"
          label="Liquidity impact"
          value={`${dec(multiple, multiple % 1 === 0 ? 0 : 1)}×`}
        />
      </div>

      {rows.length > 0 ? (
        <>
          <Block title="Where the capital goes">
            <ImpactFlow capitalUsd={capital} supportedUsd={supported} />
          </Block>

          <Block title="Liquidity supported" aside="Estimated on current conditions">
            <PortfolioTrendChart
              points={buildSupportTrail("underwrite-supported", supported)}
              label="supported"
              height={120}
              format={(n) => `$${int(n)}`}
            />
          </Block>
        </>
      ) : null}

      <div className="flex flex-col gap-s4">
        <span className="lbl">Sponsorships</span>
        <SponsorshipPortfolioTable rows={rows} />
      </div>
    </>
  );
}
