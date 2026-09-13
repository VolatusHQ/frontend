"use client";

import { useState } from "react";

/**
 * State for a `<input type="number">` that tracks exactly what the user
 * typed, not a rounded/re-parsed number fed back in as `value`.
 *
 * The latter pattern (used everywhere in this app until now) fights the DOM:
 * React only rewrites a controlled input's text when the *parsed* number
 * actually changes, so typing something like "066" — still 66 once parsed —
 * left the stale "066" sitting in the box even though every derived figure
 * elsewhere on the page correctly read 66. `raw` is always exactly what's in
 * the box; `amount` is the clamped, non-negative number derived from it, for
 * everything that isn't the input itself.
 */
export function useAmountInput(initial: number) {
  const [raw, setRaw] = useState(String(initial));
  const amount = Math.max(0, Number(raw) || 0);
  return { raw, setRaw, amount };
}
