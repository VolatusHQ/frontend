"use client";

import { usePositions } from "../../lib/positions-context";
import { openTradeRows, tradeHistoryRows } from "../../lib/portfolio";
import { useMarket } from "../../lib/market-context";
import { int } from "../../lib/format";
import { Stat } from "../../components/volatus/Stat";
import { ProfilePositionsTable } from "../../components/volatus/ProfilePositionsTable";
import { TradeHistoryTable } from "../../components/volatus/TradeHistoryTable";

export default function ProfileTradingPage() {
  const { positions, trades } = usePositions();
  const { markets } = useMarket();

  const rows = openTradeRows({ positions, markets });
  const exposure = rows.reduce((a, r) => a + r.valueUsd, 0);
  const history = tradeHistoryRows(trades);

  return (
    <>
      <div className="flex flex-wrap gap-x-s6 gap-y-s4">
        <Stat layout="value-first" size="lg" label="Trading exposure" value={`$${int(exposure)}`} />
        <Stat layout="value-first" size="lg" label="Open positions" value={int(rows.length)} />
      </div>

      <div className="flex flex-col gap-s4">
        <span className="lbl">Your positions</span>
        <ProfilePositionsTable rows={rows} />
      </div>

      <div className="flex flex-col gap-s4">
        <span className="lbl">Trade history</span>
        <TradeHistoryTable rows={history} />
      </div>
    </>
  );
}
