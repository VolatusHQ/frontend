/**
 * A small self-labelling trend line. One series, drawn in its own colour
 * with its name at the end of the line — there is no legend (DESIGN.md §9).
 * Structure / mass reads violet by default. Illustrative history, not a live
 * feed, so nothing here pulses or moves.
 */
export function TrendLine({
  points,
  label,
  stroke = "var(--violet)",
  width = 260,
  height = 64,
}: {
  points: number[];
  label?: string;
  stroke?: string;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const padX = 2;
  // A wider top band keeps the plotted line clear of the label, which always
  // sits at the end of the line in its own colour — no legend (DESIGN.md §9).
  const padTop = label ? 20 : 8;
  const padBottom = 10;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const at = (v: number, i: number) => ({
    x: padX + (i / (points.length - 1)) * innerW,
    y: padTop + innerH - ((v - min) / span) * innerH,
  });

  const d = points
    .map((v, i) => {
      const { x, y } = at(v, i);
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const last = at(points[points.length - 1], points.length - 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="block overflow-visible"
      role="img"
      aria-label={label ? `${label} over time` : "trend"}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r="2" fill={stroke} />
      {label ? (
        <text
          x={width - padX}
          y={11}
          textAnchor="end"
          fill={stroke}
          className="lbl"
          style={{ fontSize: 9, letterSpacing: "0.08em" }}
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
}
