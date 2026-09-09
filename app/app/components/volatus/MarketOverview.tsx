import { Block, Stat } from "./Stat";
import { addr, dec, int, pct } from "@/app/app/lib/format";
import { duration, usdcToNumber, wadToRatio } from "@/app/app/lib/onchain/units";
import { MEASURED_POOL_ID, MOCK_USDC, MOCK_WETH } from "@/app/app/lib/onchain/addresses";
import type { Failed, LiveMarket } from "@/app/app/lib/onchain/reads";

/**
 * The one market that exists: the mWETH/mUSDC pool, its epoch, and the price
 * of volatility discovered in the variance pool beside it.
 *
 * Every figure here is a contract call. There is no second pool, no volume
 * series and no TVL history, because none of those exist on chain — the app
 * is this size because the protocol is.
 */
export function MarketOverview({ market }: { market: LiveMarket | Failed }) {
  if (!market.ok) {
    return (
      <Block title="Unichain Sepolia" aside="chain 1301">
        <p className="text-t3 text-bone-2 m-0">
          Could not reach the chain. Nothing is inferred in its place.
        </p>
      </Block>
    );
  }

  const { epoch, status } = market;

  return (
    <div className="flex flex-col gap-s6">
      <EpochBanner market={market} />

      <div className="flex flex-wrap gap-x-s6 gap-y-s5">
        <Stat
          layout="value-first"
          size="hero"
          label="Implied"
          ink={market.impliedVolWad === null ? "neutral" : "implied"}
          value={market.impliedVolWad === null ? "no feed" : pct(wadToRatio(market.impliedVolWad))}
          sub="annualized, from the variance pool"
        />
        <Stat
          layout="value-first"
          size="hero"
          label="Realized"
          ink={market.realizedVolWad === null ? "neutral" : "realized"}
          value={market.realizedVolWad === null ? "—" : pct(wadToRatio(market.realizedVolWad))}
          sub="annualized, measured in the pool"
        />
        <Stat
          layout="value-first"
          size="lg"
          label="VAR-LONG"
          value={
            market.varLongPriceWad === null ? "—" : dec(wadToRatio(market.varLongPriceWad), 4)
          }
          sub="price, 0–1"
        />
        <Stat
          layout="value-first"
          size="lg"
          label={status === "live" ? "Epoch ends in" : "Epoch"}
          value={
            status === "live"
              ? duration(market.blocksRemaining)
              : status === "awaiting-settlement"
                ? "ended"
                : "none open"
          }
          sub={status === "live" ? "~1s blocks" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-s6 items-start">
        <Block title="Measurement" aside="SigmaHook">
          <div className="flex flex-wrap gap-x-s6 gap-y-s4">
            <Stat layout="value-first" label="Accumulator" value={int(Number(market.state.accumulator))} />
            <Stat layout="value-first" label="Observations" value={int(market.state.observations)} />
            <Stat layout="value-first" label="Last tick" value={int(market.state.lastTick)} />
            <Stat
              layout="value-first"
              label="Realized variance"
              value={market.realizedVarianceWad === null ? "—" : dec(wadToRatio(market.realizedVarianceWad), 6)}
            />
          </div>
          <p className="text-t2 text-bone-3 m-0 mt-s3">
            The accumulator only advances on a swap, so observations count trades, not blocks.
          </p>
        </Block>

        <Block title="Pools" aside="Uniswap v4">
          <div className="flex flex-wrap gap-x-s6 gap-y-s4">
            <Stat
              layout="value-first"
              label="Measured liquidity"
              value={int(Number(market.measured.liquidity) / 1e18)}
              sub={`tick ${market.measured.tick} · ${addr(MEASURED_POOL_ID)}`}
            />
            <Stat
              layout="value-first"
              label="Vol pool liquidity"
              value={market.volPool ? int(Number(market.volPool.liquidity) / 1e6) : "—"}
              sub={market.volPool ? `tick ${market.volPool.tick}` : "no vol pool registered"}
            />
          </div>
          <p className="text-t2 text-bone-3 m-0 mt-s3">
            mUSDC {addr(MOCK_USDC)} / mWETH {addr(MOCK_WETH)} — mock tokens, seeded 1:1 in raw
            units, so this pool has no meaningful dollar price. It is what variance is measured in.
          </p>
        </Block>
      </div>

      {epoch ? <EpochTerms epoch={epoch} /> : null}
    </div>
  );
}

/** The one thing a visitor must not misread: whether this market is open. */
function EpochBanner({ market }: { market: LiveMarket }) {
  const { epoch, status, blockNumber } = market;
  if (!epoch) {
    return (
      <p className="text-t4 text-bone-2 m-0">No epoch has ever been opened on this pool.</p>
    );
  }

  if (status === "live") {
    return (
      <p className="text-t4 text-bone-2 m-0">
        Epoch <span className="num text-bone">{epoch.id.toString()}</span> is open until block{" "}
        <span className="num text-bone">{epoch.endBlock.toString()}</span>. Block now{" "}
        <span className="num text-bone">{blockNumber.toString()}</span>.
      </p>
    );
  }

  if (status === "awaiting-settlement") {
    return (
      <div className="ruled pt-s4 flex flex-col gap-s2">
        <span className="lbl text-yellow">Epoch ended · not settled</span>
        <p className="text-t3 text-bone-2 m-0 max-w-[70ch]">
          Epoch <span className="num text-bone">{epoch.id.toString()}</span> ended at block{" "}
          <span className="num text-bone">{epoch.endBlock.toString()}</span>,{" "}
          <span className="num text-bone">
            {(blockNumber - epoch.endBlock).toString()}
          </span>{" "}
          blocks ago. Until someone calls <span className="num">settle()</span>, minting and
          trading are closed and the implied figure above is the last price that traded, not a
          live quote.
        </p>
      </div>
    );
  }

  return (
    <div className="ruled pt-s4 flex flex-col gap-s2">
      <span className="lbl">No epoch open</span>
      <p className="text-t3 text-bone-2 m-0 max-w-[70ch]">
        Epoch <span className="num text-bone">{epoch.id.toString()}</span> settled at payoff{" "}
        <span className="num text-bone">{dec(wadToRatio(epoch.payoffWad), 4)}</span>. Opening the
        next one is permissionless.
      </p>
    </div>
  );
}

function EpochTerms({ epoch }: { epoch: NonNullable<LiveMarket["epoch"]> }) {
  return (
    <Block title={`Epoch ${epoch.id}`} aside="SigmaVault">
      <div className="flex flex-wrap gap-x-s6 gap-y-s4">
        <Stat layout="value-first" label="Strike" value={dec(wadToRatio(epoch.strikeWad), 4)} sub="variance" />
        <Stat layout="value-first" label="Cap" value={dec(wadToRatio(epoch.capWad), 4)} sub="variance" />
        <Stat
          layout="value-first"
          label="Collateral held"
          value={`$${int(usdcToNumber(epoch.collateralHeld))}`}
          sub="mUSDC backing both legs"
        />
        <Stat
          layout="value-first"
          label="Horizon"
          value={duration(BigInt(epoch.horizonSeconds))}
        />
        <Stat
          layout="value-first"
          label="Payoff"
          value={epoch.settled ? dec(wadToRatio(epoch.payoffWad), 4) : "unsettled"}
        />
      </div>
      <p className="text-t2 text-bone-3 m-0 mt-s3">
        VAR-LONG {addr(epoch.longToken)} · VAR-SHORT {addr(epoch.shortToken)}
      </p>
    </Block>
  );
}
