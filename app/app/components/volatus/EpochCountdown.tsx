"use client";

import { useEffect, useState } from "react";
import { mmss } from "@/app/app/lib/format";

/**
 * A countdown, not a data feed. It ticks a plain seconds counter down from
 * the seed value — nothing about the market itself is recomputed here.
 * Renders the seed value on first paint so server and client agree, then
 * starts ticking after mount.
 */
export function EpochCountdown({ initialSeconds }: { initialSeconds: number }) {
  // useState's initializer handles the seed value, so the effect below only
  // ever calls setState from inside the interval callback, not synchronously
  // in the effect body.
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className="num">{mmss(seconds)}</span>;
}
