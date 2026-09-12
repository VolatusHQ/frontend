import { Block, Stat } from "./Stat";
import { dec, int, pct } from "@/app/app/lib/format";
import {
  DEMO_SUBSCRIBER_ADDRESS,
  LIVE_EPOCH_ID,
  MEASURED_POOL_ID,
  SIGMA_ORACLE,
  SIGMA_STREAM,
} from "@/app/app/lib/onchain/addresses";
import type { Failed, LiveIndex, LiveStream, LiveSubscription } from "@/app/app/lib/onchain/reads";
import { addr } from "@/app/app/lib/format";
import { blocksToDuration, duration, usdcToNumber, wadToRatio } from "@/app/app/lib/onchain/units";

/**
 * The real contracts, read at request time. This is the only surface in the
 * app that is not prototype data — the four pools in `market-data.ts` are
 * fixtures, and only the mWETH/mUSDC pool is actually measured on chain.
 *
 * Every figure is grouped under the chain it came from, because measurement
 * and the premium stream are different trust and liveness domains and Arc is
 * never part of settlement (README.md, DECISIONS.md §12). Missing feeds draw
 * as "no feed", never as a number.
 */
export function LiveFeed({
  index,
  stream,
  subscription,
}: {
  index: LiveIndex | Failed;
  stream: LiveStream | Failed;
  /** The demo LP's live subscription on `LIVE_EPOCH_ID` — read-only, no wallet required. */
  subscription: LiveSubscription | Failed;
}) {
  return (
    <div className="flex flex-col gap-s4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-s4 gap-y-s1">
        <span className="lbl">Live on chain</span>
        <span className="num text-t2 text-bone-3">
          pool {addr(MEASURED_POOL_ID)} · testnet, mock tokens
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-s6 items-start">
        <IndexPanel index={index} />
        <StreamPanel stream={stream} />
      </div>

      <SubscriberPanel subscription={subscription} />
    </div>
  );
}

function ChainNote({ children }: { children: React.ReactNode }) {
  return <p className="text-t2 text-bone-3 m-0">{children}</p>;
}

function IndexPanel({ index }: { index: LiveIndex | Failed }) {
  if (!index.ok) {
    return (
      <Block title="Unichain Sepolia · measurement" aside="chain 1301">
        <ChainNote>Could not reach the oracle. Nothing is inferred in its place.</ChainNote>
      </Block>
    );
  }

  const ivLabel =
    index.impliedVolWad === null ? "no feed" : pct(wadToRatio(index.impliedVolWad));

  return (
    <Block title="Unichain Sepolia · measurement + price" aside="chain 1301">
      <div className="flex flex-col gap-s4">
        <div className="grid grid-cols-3 gap-x-s6 gap-y-s4">
          <Stat
            layout="value-first"
            size="lg"
            label="Implied"
            ink={index.impliedVolWad === null ? "neutral" : "implied"}
            value={ivLabel}
          />
          <Stat
            layout="value-first"
            size="lg"
            label="Realized"
            ink="realized"
            value={pct(wadToRatio(index.realizedVolWad))}
          />
          <Stat
            layout="value-first"
            label="VAR-LONG"
            value={
              index.normalizedImpliedVarianceWad === null
                ? "—"
                : dec(wadToRatio(index.normalizedImpliedVarianceWad), 4)
            }
            sub="market price, 0–1"
          />
        </div>

        <div className="ruled pt-s3 grid grid-cols-3 gap-x-s6 gap-y-s4">
          <Stat layout="value-first" label="Accumulator" value={int(Number(index.state.accumulator))} />
          <Stat layout="value-first" label="Observations" value={int(index.state.observations)} />
          <Stat layout="value-first" label="Last tick" value={int(index.state.lastTick)} />
        </div>

        <ChainNote>
          Epoch{" "}
          <span className="num text-bone-2">
            {index.activeEpochId === 0n ? "none open" : index.activeEpochId.toString()}
          </span>{" "}
          · strike <span className="num text-bone-2">{dec(wadToRatio(index.strikeWad), 4)}</span> ·
          cap <span className="num text-bone-2">{dec(wadToRatio(index.capWad), 4)}</span> variance
          over the epoch horizon.{" "}
          {index.awaitingSettlement ? (
            <>
              Ended at block{" "}
              <span className="num text-bone-2">{index.endBlock.toString()}</span> and awaiting
              settlement, so the implied figure is the last traded price.
            </>
          ) : index.epochEnded ? (
            <>Settled. Block {index.blockNumber.toString()}.</>
          ) : (
            <>
              <span className="num text-bone-2">
                {blocksToDuration(index.endBlock - index.blockNumber)}
              </span>{" "}
              of the epoch left, at ~1s per block.
            </>
          )}
        </ChainNote>
      </div>
    </Block>
  );
}

function StreamPanel({ stream }: { stream: LiveStream | Failed }) {
  if (!stream.ok) {
    return (
      <Block title="Arc Testnet · premium stream" aside="chain 5042002">
        <ChainNote>
          Could not reach Arc. Streams stopping means coverage lapses — nothing is stuck, and
          settlement on Unichain is unaffected.
        </ChainNote>
      </Block>
    );
  }

  const e = stream.epoch;

  return (
    <Block title="Arc Testnet · premium stream" aside="chain 5042002">
      <div className="flex flex-col gap-s4">
        <div className="grid grid-cols-3 gap-x-s6 gap-y-s4">
          <Stat
            layout="value-first"
            size="lg"
            label="Capacity pool"
            value={`$${dec(usdcToNumber(stream.capacityPoolUsdc), 4)}`}
            sub="underwriter capital + premium earned"
          />
          <Stat
            layout="value-first"
            label="Coverage sold"
            value={e ? `$${dec(usdcToNumber(e.totalCoverageSold), 2)}` : "—"}
            sub="notional-seconds"
          />
        </div>

        <div className="ruled pt-s3 grid grid-cols-3 gap-x-s6 gap-y-s4">
          <Stat layout="value-first" label="Shares" value={int(usdcToNumber(stream.totalShares))} />
          <Stat layout="value-first" label="Reporter" value={addr(stream.settlementReporter)} />
        </div>

        {e === null ? (
          <ChainNote>
            Epoch {stream.epochId.toString()} was never mirrored onto Arc, so no coverage was ever
            sold against it.
          </ChainNote>
        ) : (
          <ChainNote>
            Epoch <span className="num text-bone-2">{stream.epochId.toString()}</span> ·{" "}
            {stream.refundable ? (
              <>
                the report window closed with no payoff published, so the fail-safe is live:
                subscribers reclaim unspent premium and underwriters withdraw capacity.
              </>
            ) : e.reported ? (
              <>
                settled at payoff{" "}
                <span className="num text-bone-2">{dec(wadToRatio(e.payoffWad), 4)}</span>.
              </>
            ) : e.coverageEnd > stream.timestamp ? (
              <>
                coverage ends in{" "}
                <span className="num text-bone-2">
                  {duration(e.coverageEnd - stream.timestamp)}
                </span>
                , report due within{" "}
                <span className="num text-bone-2">
                  {duration(e.reportDeadline - stream.timestamp)}
                </span>
                .
              </>
            ) : (
              <>
                coverage ended{" "}
                <span className="num text-bone-2">
                  {duration(stream.timestamp - e.coverageEnd)}
                </span>{" "}
                ago and the payoff has not been reported yet —{" "}
                <span className="num text-bone-2">
                  {duration(e.reportDeadline - stream.timestamp)}
                </span>{" "}
                of the report window left.
              </>
            )}
          </ChainNote>
        )}

        <ChainNote>
          Arc is a payment rail for a subscription and is never part of settlement.
        </ChainNote>
      </div>
    </Block>
  );
}

/**
 * The demo LP's actual subscription state on `LIVE_EPOCH_ID` -- read-only, no
 * wallet connection needed, visible to every visitor. Before this panel
 * existed, `funded`/`runwaySeconds`/`coveredSeconds` were only reachable by
 * connecting the exact wallet that holds the subscription
 * (`LiveStreamActions.tsx`'s `SubscriberCard`), so the most interesting live
 * state the protocol has -- a stream that has genuinely run dry, the coverage
 * fail-safe firing for real -- was invisible to anyone just browsing the site
 * (HANDOFF.md section Frontend gap).
 */
function SubscriberPanel({ subscription }: { subscription: LiveSubscription | Failed }) {
  if (!subscription.ok) {
    return (
      <Block title="Arc Testnet · a live subscription" aside="chain 5042002">
        <ChainNote>Could not reach Arc. Nothing is inferred in its place.</ChainNote>
      </Block>
    );
  }

  if (subscription.empty) {
    return (
      <Block title="Arc Testnet · a live subscription" aside="chain 5042002">
        <ChainNote>
          The demo LP has no subscription on epoch {LIVE_EPOCH_ID.toString()}.
        </ChainNote>
      </Block>
    );
  }

  const lapsed = subscription.runwaySeconds === 0n && !subscription.claimed;

  return (
    <Block
      title="Arc Testnet · a live subscription"
      aside={`${addr(DEMO_SUBSCRIBER_ADDRESS)} · epoch ${LIVE_EPOCH_ID.toString()}`}
    >
      <div className="flex flex-col gap-s4">
        <div className="grid grid-cols-4 gap-x-s6 gap-y-s4">
          <Stat
            layout="value-first"
            size="lg"
            label="Funded"
            ink={lapsed ? "down" : "neutral"}
            value={`$${dec(usdcToNumber(subscription.funded), 4)}`}
          />
          <Stat
            layout="value-first"
            label="Coverage notional"
            value={`$${dec(usdcToNumber(subscription.coverageNotional), 2)}`}
          />
          <Stat
            layout="value-first"
            label="Runway"
            ink={lapsed ? "down" : "neutral"}
            value={duration(subscription.runwaySeconds)}
          />
          <Stat
            layout="value-first"
            label="Covered so far"
            value={duration(subscription.coveredSeconds)}
          />
        </div>

        <ChainNote>
          {subscription.claimed ? (
            <>This subscription has already claimed its payoff.</>
          ) : lapsed ? (
            <>
              Coverage lapsed at the exact second the funded balance ran dry -- this is the
              fail-safe working, not an error. The subscriber can top up to resume, or reclaim
              unspent premium if the epoch's report window has closed.
            </>
          ) : (
            <>Coverage is active and draining at the subscribed rate.</>
          )}
        </ChainNote>
      </div>
    </Block>
  );
}

/** Explorer links, so any figure above can be checked against the chain. */
export function LiveFeedLinks() {
  return (
    <div className="flex flex-wrap gap-x-s5 gap-y-s2 text-t2">
      <a
        href={`https://sepolia.uniscan.xyz/address/${SIGMA_ORACLE}`}
        target="_blank"
        rel="noreferrer"
        className="text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms]"
      >
        VolatusOracle on Uniscan →
      </a>
      <span className="num text-bone-3">VolatusStream on Arc {addr(SIGMA_STREAM)}</span>
    </div>
  );
}
