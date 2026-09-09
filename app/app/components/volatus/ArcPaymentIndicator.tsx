import { ArcMark } from "./ArcMark";

/**
 * Makes the payment rail visible without turning it into documentation.
 * Arc is the infrastructure the USDC premium streams through — not the
 * protection provider. A subtle line, not a footer, not a logo lockup.
 */
export function ArcPaymentIndicator() {
  return (
    <div className="flex items-baseline justify-between gap-s4">
      <span className="lbl">Payment</span>
      <span className="num text-t2 text-bone-3">
        USDC <span aria-hidden="true">→</span> <ArcMark /> <span aria-hidden="true">→</span> Protection
      </span>
    </div>
  );
}
