/**
 * A subordinate single-series line — the small performance charts on the
 * Trading / Liquidity / Underwriting portfolio views. Same drawing model as
 * VolatilityHistoryChart (viewBox + `w-full h-auto`, so it fills its column
 * at any width), quieter still: no controls, one line, the series names
 * itself at its own end (§15.4). Structure / capital reads violet by default.
 */
export function PortfolioTrendChart({
  points,
  label,
  stroke = "var(--violet)",
  height = 120,
  format = (n: number) => String(Math.round(n)),
}: {
  points: number[];
  label: string;
  stroke?: string;
  height?: number;
  format?: (n: number) => string;
}) {
  if (points.length < 2) return null;

  const W = 600;
  const H = height;
  const padL = 6;
  const padR = 84;
  const padT = 12;
  const padB = 14;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const rawMin = Math.min(...points);
  const rawMax = Math.max(...points);
  const margin = (rawMax - rawMin) * 0.2 || Math.max(Math.abs(rawMax) * 0.05, 1);
  const min = rawMin - margin;
  const max = rawMax + margin;

  const x = (i: number) => padL + (i / (points.length - 1)) * innerW;
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * innerH;

  const line = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const gridLines = [0, 0.5, 1].map((f) => min + (max - min) * f);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label={`${label}, latest ${format(last)}`}
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

      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(points.length - 1)} cy={y(last)} r="2.5" fill={stroke} />

      <text
        x={W - padR + 10}
        y={y(last)}
        dominantBaseline="middle"
        fill={stroke}
        fontFamily="var(--font-mono)"
        fontSize="10"
      >
        {label}
      </text>
    </svg>
  );
}
