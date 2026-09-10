import { WALLET_ADDRESS } from "@/app/app/lib/account";
import { addr } from "@/app/app/lib/format";

/**
 * The account identity for the Profile section. Deliberately understated —
 * the address is a caption, not the headline (the portfolio is the subject).
 */
export function AccountHeader() {
  return (
    <div className="flex flex-col gap-s1">
      <h1 className="font-serif text-d4 font-medium leading-[1.12] tracking-[-0.012em] m-0">
        Your portfolio
      </h1>
      <span className="num text-t2 text-bone-3">{addr(WALLET_ADDRESS)}</span>
    </div>
  );
}
