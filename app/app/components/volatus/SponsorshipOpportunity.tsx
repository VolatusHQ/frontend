import { Block, Stat } from "./Stat";
import { formatSeverityLabel, type VolSeverity } from "@/app/app/lib/onchain/severity";

/**
 * The case for sponsoring, and why: not the prototype's fabricated
 * "opportunity" score (that needed `protectedShare`/`impactMultiple`, which
 * are not modeled on this pool — see `live-market.ts`), but the real signal
 * a sponsor actually has: where this pool's volatility sits right now,
 * relative to its own history, and whether the rate a subscriber would pay
 * is currently priced rich or cheap (`severity.ts` — the same
 * `spreadWad`/`dataSufficient` read the underwriter service itself uses).
 *
 * `severity === null` when the roller's `/vol-history` endpoint isn't
 * configured or reachable — rendered as an honest "not enough data yet"
 * state, never a guess. Amount-picking lives in `SponsorPanel` only, so
 * there is exactly one place on the page to choose a number.
 */
export function SponsorshipOpportunity({ severity }: { severity: VolSeverity | null }) {
  return (
    <Block title="Volatility read">
      <div className="flex flex-col gap-s3">
        <Stat
          size="lg"
          ink={severity && (severity.tier === "high" || severity.tier === "extreme") ? "warn" : "neutral"}
          label="Current volatility"
          value={severity ? formatSeverityLabel(severity) : "not enough data yet"}
          sub="relative to this pool's own trailing history, not a fixed scale"
        />

        <p className="text-t3 text-bone-2 m-0 max-w-[60ch]">
          Capacity posted here backs coverage for subscribers streaming premium at the
          market&apos;s implied rate — the higher this reads, the richer that rate is priced.
        </p>
      </div>
    </Block>
  );
}
