"use client";

import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { int } from "@/app/app/lib/format";
import { useAmountInput } from "@/app/app/lib/useAmountInput";

/**
 * A secondary flow — adding to the position, not protecting it. Kept
 * visually subordinate to Start protection: the trigger is a text link,
 * never a filled button.
 *
 * `onAdd` is real on the one pool this app actually trades (see
 * `liquidity-context.tsx`'s `addLiquidity` — a genuine Permit2 approval and
 * Uniswap v4 position mint) and a no-op everywhere else. This component has
 * no way to tell which it's wired to, so it never claims either way.
 */
export function AddLiquidityDialog({ onAdd }: { onAdd: (usdcAmount: number) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { raw, setRaw, amount } = useAmountInput(10_000);

  // `onAdd` runs a real multi-transaction chain (Permit2 approvals, then the
  // mint) against a live wallet. Without a guard here, a second click before
  // the first chain's approvals land re-reads the same starting nonce and
  // sends an overlapping approve — the wallet accepts both, one confirms,
  // and the other comes back "nonce too low" against an already-mined nonce.
  async function submit() {
    if (submitting || amount <= 0) return;
    setSubmitting(true);
    try {
      await onAdd(amount);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-t3 text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms]"
        >
          Add liquidity
        </button>
      </DialogTrigger>
      <DialogContent
        onEscapeKeyDown={(e) => submitting && e.preventDefault()}
        onPointerDownOutside={(e) => submitting && e.preventDefault()}
        className="border-hair bg-panel flex flex-col gap-s4"
      >
        <DialogTitle className="font-serif text-t5 font-medium">Add liquidity</DialogTitle>
        <DialogDescription className="text-t3 text-bone-2">
          Deposits mUSDC and mWETH into the pool via a real Uniswap v4 position.
        </DialogDescription>
        <label className="flex flex-col gap-s1">
          <span className="lbl">Amount (USDC)</span>
          <input
            type="number"
            min={0}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="border border-hair px-s3 py-s2 text-t4 num bg-transparent"
          />
        </label>
        <span className="num text-t3 text-bone-2">Adds ${int(amount)} to your position</span>
        <DialogFooter className="flex flex-row justify-end gap-s4">
          <DialogClose asChild>
            <button
              type="button"
              disabled={submitting}
              className="bg-transparent border-0 text-t3 text-bone-2 hover:text-bone transition-colors duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            disabled={amount <= 0 || submitting}
            onClick={submit}
            className="bg-pink text-ink px-s4 py-s2 text-t3 font-medium hover:opacity-90 transition-opacity duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Confirm in wallet…" : "Add liquidity"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
