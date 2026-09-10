import { Stat } from "./Stat";
import { int } from "@/app/app/lib/format";

function Arrow() {
  return (
    <span aria-hidden="true" className="num text-t4 text-bone-3 self-start sm:self-center">
      <span className="sm:hidden">↓</span>
      <span className="hidden sm:inline">→</span>
    </span>
  );
}

/**
 * The economic purpose of underwriting, in one line: capital funds LP
 * protection, which supports liquidity. Every figure downstream of the
 * sponsorship is an estimate — the language stays "supported", never
 * "guaranteed".
 */
export function ImpactFlow({
  capitalUsd,
  supportedUsd,
}: {
  capitalUsd: number;
  supportedUsd: number;
}) {
  return (
    <div className="flex flex-col gap-s3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-s4">
        <Stat layout="value-first" label="sponsorship" value={`$${int(capitalUsd)}`} />
        <Arrow />
        <Stat layout="value-first" label="funds" value="LP protection" />
        <Arrow />
        <Stat
          layout="value-first"
          label="liquidity supported"
          value={`~$${int(supportedUsd)}`}
        />
      </div>
      <p className="text-t3 text-bone-3 m-0 max-w-[52ch]">
        Estimated on current conditions. Sponsorship funds protection for LPs; it does not add
        liquidity to the pool directly.
      </p>
    </div>
  );
}
