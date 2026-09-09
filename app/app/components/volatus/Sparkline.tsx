"use client";

import { useMemo } from "react";

/**
 * An inline micro-chart for a table row. Two series, same semantics as the
 * full chart: yellow realized, pink implied. No axes, no labels — at this size
 * it carries shape only, and the row's own columns carry the numbers.
 */
export function Sparkline({
  realized,
  implied,
  width = 96,
  height = 26,
}: {
  realized: number[];
  implied: number[];
  width?: number;
  height?: number;
}) {
  const { pr, pi } = useMemo(() => {
    const all = [...realized, ...implied];
    if (!all.length) return { pr: "", pi: "" };
    const min = Math.min(...all);
    const max = Math.max(...all);
    const span = max - min || 1;
    const line = (arr: number[]) =>
      arr
        .map((v, i) => {
          const x = (i / Math.max(1, arr.length - 1)) * (width - 2) + 1;
          const y = height - 2 - ((v - min) / span) * (height - 4);
          return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    return { pr: line(realized), pi: line(implied) };
  }, [realized, implied, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      className="vx-spark block overflow-visible"
    >
      <path d={pi} fill="none" stroke="var(--pink)" strokeWidth="1.25" strokeLinejoin="round" opacity="0.85" />
      <path d={pr} fill="none" stroke="var(--yellow)" strokeWidth="1.25" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}
