import { Block, Stat } from "./Stat";
import { addr, dec, int } from "@/app/app/lib/format";
import { duration, usdcToNumber, wadToRatio } from "@/app/app/lib/onchain/units";
import type { Failed, LiveStream } from "@/app/app/lib/onchain/reads";

/**
 * The stream's own state on Arc, read at request time.
 *
 * The reporter line matters more than it looks: the payoff is measured on
 * Unichain and published here by one fixed address, and that is the only trust
 * surface in the contract. When the window closes unreported, the fail-safe is
 * what the UI must show — not a pending claim that will never pay.
 */
export function StreamState({ stream }: { stream: LiveStream | Failed }) {
  if (!stream.ok) {
    return (
      <Block title="Arc Testnet" aside="chain 5042002">
        <p className="text-t3 text-bone-2 m-0">
          Could not reach Arc. Streams stopping means coverage lapses — nothing is stuck, and
          settlement on Unichain is unaffected.
        </p>
      </Block>
    );
  }

  const e = stream.epoch;

  return (
    <div className="flex flex-col gap-s5">
      <div className="flex flex-wrap gap-x-s6 gap-y-s5">
        <Stat
          layout="value-first"
          size="hero"
          label="Capacity pool"
          value={`$${dec(usdcToNumber(stream.capacityPoolUsdc), 4)}`}
          sub="underwriter capital + premium earned"
        />
        <Stat
          layout="value-first"
          size="lg"
          label="Coverage sold"
          value={e ? `$${dec(usdcToNumber(e.totalCoverageSold), 2)}` : "—"}
          sub="notional-seconds"
        />
        <Stat layout="value-first" size="lg" label="Shares" value={int(usdcToNumber(stream.totalShares))} />
      </div>

      {e === null ? (
        <p className="text-t3 text-bone-2 m-0">
          Epoch {stream.epochId.toString()} was never mirrored onto Arc, so no coverage was sold
          against it.
        </p>
      ) : stream.refundable ? (
        <div className="ruled pt-s4 flex flex-col gap-s2">
          <span className="lbl text-yellow">Report window closed · fail-safe live</span>
          <p className="text-t3 text-bone-2 m-0 max-w-[70ch]">
            No payoff was published before the deadline, so this epoch can never pay a claim.
            Subscribers reclaim unspent premium and underwriters withdraw capacity. The reporter
            is <span className="num text-bone">{addr(stream.settlementReporter)}</span>, a key
            nobody on the team holds — fixing that means redeploying, which WIRING.md § Redeploy
            covers.
          </p>
        </div>
      ) : e.reported ? (
        <p className="text-t3 text-bone-2 m-0">
          Settled at payoff{" "}
          <span className="num text-bone">{dec(wadToRatio(e.payoffWad), 4)}</span>. Reporter{" "}
          <span className="num text-bone">{addr(stream.settlementReporter)}</span>.
        </p>
      ) : (
        <p className="text-t3 text-bone-2 m-0">
          {e.coverageEnd > stream.timestamp ? (
            <>
              Coverage ends in{" "}
              <span className="num text-bone">{duration(e.coverageEnd - stream.timestamp)}</span>.
            </>
          ) : (
            <>
              Coverage ended{" "}
              <span className="num text-bone">{duration(stream.timestamp - e.coverageEnd)}</span>{" "}
              ago, payoff not yet reported.
            </>
          )}{" "}
          Report due within{" "}
          <span className="num text-bone">{duration(e.reportDeadline - stream.timestamp)}</span>.
        </p>
      )}
    </div>
  );
}
