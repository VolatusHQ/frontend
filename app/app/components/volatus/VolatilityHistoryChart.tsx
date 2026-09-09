import { pct } from "@/app/app/lib/format";
import type { VolatilityPoint } from "@/app/app/lib/market-data";

/**
 * Realized vs implied volatility over the recent window. Same semantics as
 * the Markets chart — yellow realized, pink implied, the band between them
 * is the spread — but hand-rolled SVG and deliberately quieter: on the
 * Liquidity page the hierarchy is Position → Risk → Protection, and this is
 * context, not the main event. No axes beyond hairline gridlines, no
 * crosshair, no controls. Each line names itself at its own end (§15.4).
 */
export function VolatilityHistoryChart({
  history,
  height = 220,
}: {
  history: VolatilityPoint[];
  height?: number;
}) {
  const W = 600;
  const H = height;
  const padL = 6;
  const padR = 92;
  const padT = 14;
  const padB = 16;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const values = history.flatMap((p) => [p.realized, p.implied]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const margin = (rawMax - rawMin) * 0.18 || 0.01;
  const min = rawMin - margin;
  const max = rawMax + margin;

  const x = (i: number) => padL + (i / (history.length - 1)) * innerW;
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * innerH;

  const line = (key: "realized" | "implied") =>
    history.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");

  const impliedLine = line("implied");
  const realizedLine = line("realized");

  const band =
    history.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.implied).toFixed(1)}`).join(" ") +
    history
      .map(
        (_p, i) =>
          `L${x(history.length - 1 - i).toFixed(1)},${y(history[history.length - 1 - i].realized).toFixed(1)}`,
      )
      .join(" ") +
    " Z";

  const last = history[history.length - 1];
  const gridLines = [0, 0.5, 1].map((f) => min + (max - min) * f);

  // Keep the two end-of-line labels from colliding when the lines converge.
  let implLabelY = y(last.implied);
  let realLabelY = y(last.realized);
  if (Math.abs(implLabelY - realLabelY) < 12) {
    const mid = (implLabelY + realLabelY) / 2;
    implLabelY = last.implied >= last.realized ? mid - 7 : mid + 7;
    realLabelY = last.implied >= last.realized ? mid + 7 : mid - 7;
  }

  return (
    <div className="flex flex-col gap-s2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-s4 gap-y-s1">
        <span className="lbl">Volatility · last {history.length} intervals</span>
        <span className="num text-t2">
          <span className="text-yellow">realized {pct(last.realized)}</span>
          <span className="text-bone-3"> · </span>
          <span className="text-pink">implied {pct(last.implied)}</span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Realized volatility ${pct(last.realized)}, implied volatility ${pct(last.implied)}`}
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

        <path d={band} fill="var(--pink)" fillOpacity="0.08" stroke="none" />
        <path d={realizedLine} fill="none" stroke="var(--yellow)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={impliedLine} fill="none" stroke="var(--pink)" strokeWidth="1.5" strokeLinejoin="round" />

        <text
          x={W - padR + 10}
          y={implLabelY}
          dominantBaseline="middle"
          fill="var(--pink)"
          fontFamily="var(--font-mono)"
          fontSize="10"
        >
          implied
        </text>
        <text
          x={W - padR + 10}
          y={realLabelY}
          dominantBaseline="middle"
          fill="var(--yellow)"
          fontFamily="var(--font-mono)"
          fontSize="10"
        >
          realized
        </text>
      </svg>

      <div className="flex justify-between num text-t2 text-bone-3">
        <span>{pct(min)}</span>
        <span>{pct(max)}</span>
      </div>
    </div>
  );
}
