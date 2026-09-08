"use client";

import { useCallback, useState } from "react";
import { errorMessage } from "./writes";

export type TxState =
  | { status: "idle" }
  | { status: "pending"; label: string }
  | { status: "done"; label: string }
  | { status: "error"; message: string };

/**
 * One in-flight transaction sequence per panel.
 *
 * A revert is shown verbatim rather than swallowed: `EpochClosed`,
 * `InsufficientCapacity` and `NoSuchEpoch` are all states a user can legitimately
 * hit, and the contract's own error name explains the situation better than any
 * message this UI could invent.
 */
export function useTx() {
  const [state, setState] = useState<TxState>({ status: "idle" });

  const run = useCallback(async (label: string, fn: () => Promise<void>, done = "Confirmed") => {
    setState({ status: "pending", label });
    try {
      await fn();
      setState({ status: "done", label: done });
      return true;
    } catch (e) {
      setState({ status: "error", message: errorMessage(e) });
      return false;
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, run, reset, busy: state.status === "pending" };
}

/** The one-line status a panel renders under its controls. */
export function txMessage(state: TxState): { text: string; tone: "muted" | "bad" } | null {
  if (state.status === "pending") return { text: state.label, tone: "muted" };
  if (state.status === "done") return { text: state.label, tone: "muted" };
  if (state.status === "error") return { text: state.message, tone: "bad" };
  return null;
}
