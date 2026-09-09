import { Block, Stat } from "./Stat";
import { int, pct } from "@/app/app/lib/format";
import { downsideBand, type LiquidityParams } from "@/app/app/lib/liquidity-data";

/**
 * Translates pool conditions into something about the LP's own position:
 * roughly how bad an adverse move could be, across three volatility
 * regimes. Presented as a scenario, never as a prediction of loss — the
 * caption says so and the copy never claims "you will lose".
 *
 * Scaled to the whole position value, so it answers "how exposed am I",
 * independent of how much the LP then chooses to protect.
 */
export function LpRiskEstimate({
  positionUsd,
  params,
}: {
  positionUsd: number;
  params: LiquidityParams;
}) {
  const band = downsideBand(positionUsd, params);
  const fmt = (v: number) => `−$${int(Math.abs(v))}`;

  return (
    <Block title="Estimated downside">
      <div className="flex flex-col gap-s3">
        <div className="flex flex-wrap items-end gap-x-s7 gap-y-s4">
          <Stat layout="value-first" label="Lower volatility" value={fmt(band.lower)} />
          <Stat
            layout="value-first"
            size="lg"
            label="Current conditions"
            value={fmt(band.current)}
            sub={`~${pct(params.downsideCurrentPct)} of your position`}
          />
          <Stat layout="value-first" label="Higher volatility" value={fmt(band.higher)} />
        </div>
        <p className="text-t3 text-bone-3 m-0 max-w-[52ch]">
          Scenario estimate from current volatility and pool conditions. Not a prediction of loss.
        </p>
      </div>
    </Block>
  );
}
