"use client";

import { useState } from "react";
import { cn } from "@/app/app/lib/utils";
import { int } from "@/app/app/lib/format";
import { buildPortfolioTrail, TIMEFRAMES, type Timeframe } from "@/app/app/lib/portfolio";

/**
 * Portfolio value over time. Hand-rolled SVG (§12: a charting library would
 * fight the palette), one line in bone because the total is neither realized
 * nor implied nor structural (§15.2), horizontal gridlines only, and the
 * series names itself at its own end (§15.4).
 *
 * The line's endpoint is the live total; the trajectory behind it is
 * deterministic decoration, so the chart shows no derived return figure —
 * the real numbers live in the summary row above it. Only the axis bounds,
 * which are chart scale rather than a claim, are printed.
 */
export function PerformanceChart({ total, height = 168 }: { total: number; height?: number }) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const points = buildPortfolioTrail(total, timeframe);

  const W = 600;
  const H = height;
  const padL = 6;
  const padR = 92;
  const padT = 16;
  const padB = 16;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const rawMin = Math.min(...points);
  const rawMax = Math.max(...points);
  const margin = (rawMax - rawMin) * 0.18 || Math.max(rawMax * 0.02, 1);
  const min = rawMin - margin;
  const max = rawMax + margin;

  const x = (i: number) => padL + (i / (points.length - 1)) * innerW;
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * innerH;

  const line = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${x(0).toFixed(
    1,
  )},${(H - padB).toFixed(1)} Z`;

  const last = points[points.length - 1];
  const gridLines = [0, 0.5, 1].map((f) => min + (max - min) * f);

  return (
    <div className="flex flex-col gap-s3">
      <div className="flex flex-wrap items-center justify-between gap-x-s4 gap-y-s2">
        <span className="lbl">Portfolio performance</span>

        <div className="flex border border-hair">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === timeframe}
              onClick={() => setTimeframe(t)}
              className={cn(
                "px-s3 py-[5px] text-t2 num transition-colors duration-[140ms]",
                t === timeframe ? "bg-panel-2 text-bone" : "text-bone-3 hover:text-bone",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={`Portfolio value over ${timeframe}, currently ${int(last)} dollars`}
      >
        {gridLines.map((gv, i) => (
          <line
            key={i}
            x1={padL}
            x2={W - padR}
            y1={y(gv).toFixed(1)}
            y2={y(gv).toFixed(1)}
            stroke="var(--hair)"
            strokeWidth="1"
          />
        ))}

        <path d={area} fill="var(--bone)" fillOpacity="0.05" stroke="none" />
        <path
          className="vx-draw"
          d={line}
          fill="none"
          stroke="var(--bone)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={x(points.length - 1)} cy={y(last)} r="2.5" fill="var(--bone)" />

        <text
          x={W - padR + 10}
          y={y(last)}
          dominantBaseline="middle"
          fill="var(--bone-2)"
          fontFamily="var(--font-mono)"
          fontSize="10"
        >
          portfolio
        </text>
      </svg>

      <div className="flex justify-between num text-t2 text-bone-3">
        <span>${int(min)}</span>
        <span>${int(max)}</span>
      </div>
    </div>
  );
}
