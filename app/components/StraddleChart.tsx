"use client";

import { useEffect, useRef } from "react";

/**
 * The LP payoff against price change, animated. A marker sweeps the price
 * axis back and forth: flat fee income near the entry price, losses that
 * grow in both directions. That shape is a short straddle.
 *
 * Plotted on the sqrt(r) axis, where the loss has an exact closed form
 *   IL(r) = -(V0 / 2) * (sqrt(r) - 1)^2
 * so the curve reads as the symmetric thing it is.
 */

const V0 = 20_000;
const FEES = 412;
const U_LO = 0.72;
const U_HI = 1.28;
const BE = Math.sqrt((2 * FEES) / V0); // break-even offset in sqrt(r)

const W = 540;
const H = 380;
const PX = 46;
const PT = 30;
const PB = 48;

const il = (u: number) => -(V0 / 2) * (u - 1) ** 2;
const net = (u: number) => FEES + il(u);
const move = (u: number) => (u * u - 1) * 100;

const Y_HI = FEES + 70;
const Y_LO = net(U_LO) - 40;
const x = (u: number) => PX + ((u - U_LO) / (U_HI - U_LO)) * (W - PX * 2);
const y = (v: number) => H - PB - ((v - Y_LO) / (Y_HI - Y_LO)) * (H - PT - PB);

const CURVE = Array.from({ length: 121 }, (_, i) => {
  const u = U_LO + ((U_HI - U_LO) * i) / 120;
  return `${x(u).toFixed(1)},${y(net(u)).toFixed(1)}`;
}).join(" ");

function wing(a: number, b: number) {
  const pts = Array.from({ length: 40 }, (_, i) => {
    const u = a + ((b - a) * i) / 39;
    return `${x(u).toFixed(1)},${y(net(u)).toFixed(1)}`;
  }).join(" ");
  return `${x(a).toFixed(1)},${y(0).toFixed(1)} ${pts} ${x(b).toFixed(1)},${y(0).toFixed(1)}`;
}
const WING_L = wing(U_LO, 1 - BE);
const WING_R = wing(1 + BE, U_HI);

const usd = (v: number) =>
  `${v < 0 ? "−" : ""}$${Math.abs(Math.round(v)).toLocaleString("en-US")}`;

export function StraddleChart() {
  const wrap = useRef<HTMLDivElement>(null);
  const dot = useRef<SVGGElement>(null);
  const guide = useRef<SVGLineElement>(null);
  const moveEl = useRef<HTMLSpanElement>(null);
  const netEl = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const PERIOD = 9000;
    let raf = 0;
    let base = performance.now();

    const paint = (u: number) => {
      const px = x(u);
      const py = y(net(u));
      dot.current?.setAttribute("transform", `translate(${px} ${py})`);
      guide.current?.setAttribute("x1", String(px));
      guide.current?.setAttribute("x2", String(px));
      const m = move(u);
      const n = net(u);
      if (moveEl.current) {
        moveEl.current.textContent = `${m >= 0 ? "+" : "−"}${Math.abs(m).toFixed(0)}%`;
      }
      if (netEl.current) {
        netEl.current.textContent = usd(n);
        netEl.current.dataset.neg = String(n < 0);
      }
    };

    if (reduce) {
      paint(1 - BE * 1.4);
      return () => io.disconnect();
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) {
        base = now;
        return;
      }
      const ph = (1 - Math.cos((2 * Math.PI * ((now - base) % PERIOD)) / PERIOD)) / 2;
      paint(U_LO + (U_HI - U_LO) * ph);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <div className="straddle" ref={wrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Liquidity-provider profit against price change: flat fee income near the entry price, losses that grow in both directions as the price moves — the shape of a short straddle."
      >
        <polygon points={WING_L} className="st-loss" />
        <polygon points={WING_R} className="st-loss" />

        <line x1={PX} y1={y(0)} x2={W - PX} y2={y(0)} className="st-axis" />
        <line x1={PX} y1={y(FEES)} x2={W - PX} y2={y(FEES)} className="st-fees" />
        {[1 - BE, 1 + BE].map((u) => (
          <line key={u} x1={x(u)} y1={y(0) - 6} x2={x(u)} y2={y(0) + 6} className="st-be" />
        ))}

        <polyline points={CURVE} className="st-curve" />

        <line
          ref={guide}
          x1={x(1)}
          y1={PT}
          x2={x(1)}
          y2={H - PB}
          className="st-guide"
        />
        <g ref={dot} transform={`translate(${x(1)} ${y(net(1))})`}>
          <circle r="12" className="st-dot-halo" />
          <circle r="5.5" className="st-dot" />
        </g>

        <text x={PX + 2} y={y(FEES) - 9} className="st-lab st-lab--fees">
          fees {usd(FEES)}
        </text>
        <text x={W - PX - 2} y={y(0) - 9} className="st-lab" textAnchor="end">
          break even
        </text>
        <text x={x(1 - BE)} y={y(0) + 22} className="st-lab" textAnchor="middle">
          {move(1 - BE).toFixed(0)}%
        </text>
        <text x={x(1 + BE)} y={y(0) + 22} className="st-lab" textAnchor="middle">
          +{move(1 + BE).toFixed(0)}%
        </text>
      </svg>

      <div className="st-readout">
        <span className="st-readout__k">price</span>
        <span className="st-readout__v" ref={moveEl}>
          +0%
        </span>
        <span className="st-readout__k">net vs holding</span>
        <span className="st-readout__v st-readout__net" ref={netEl} data-neg="false">
          {usd(FEES)}
        </span>
      </div>
    </div>
  );
}
