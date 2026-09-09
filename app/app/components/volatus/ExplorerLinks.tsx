import { addr } from "@/app/app/lib/format";
import { SIGMA_ORACLE, SIGMA_STREAM, SIGMA_VAULT } from "@/app/app/lib/onchain/addresses";

const LINK =
  "text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms]";

/** Every number on the page can be checked against the chain. These are the way in. */
export function ExplorerLinks() {
  return (
    <div className="flex flex-wrap gap-x-s5 gap-y-s2 text-t2">
      <a
        href={`https://sepolia.uniscan.xyz/address/${SIGMA_ORACLE}`}
        target="_blank"
        rel="noreferrer"
        className={LINK}
      >
        SigmaOracle →
      </a>
      <a
        href={`https://sepolia.uniscan.xyz/address/${SIGMA_VAULT}`}
        target="_blank"
        rel="noreferrer"
        className={LINK}
      >
        SigmaVault →
      </a>
      <span className="num text-bone-3">SigmaStream on Arc {addr(SIGMA_STREAM)}</span>
    </div>
  );
}
