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

/**
 * A short confirmation. Stopping protection ends the payment stream; the
 * wording says exactly that and nothing more.
 */
export function StopProtectionDialog({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-t3 text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms]"
        >
          Stop protection
        </button>
      </DialogTrigger>
      <DialogContent className="border-hair bg-panel flex flex-col gap-s4">
        <DialogTitle className="font-serif text-t5 font-medium">Stop protection?</DialogTitle>
        <DialogDescription className="text-t3 text-bone-2">
          Your protection ends when the stream is stopped.
        </DialogDescription>
        <DialogFooter className="flex flex-row justify-end gap-s4">
          <DialogClose asChild>
            <button
              type="button"
              className="text-t3 text-bone-2 hover:text-bone transition-colors duration-[140ms]"
            >
              Keep protection
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            className="bg-pink text-ink px-s4 py-s2 text-t3 font-medium hover:opacity-90 transition-opacity duration-[140ms]"
          >
            Stop protection
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
