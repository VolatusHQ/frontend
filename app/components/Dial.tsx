"use client";

import { useEffect, useRef, useState } from "react";

export type DialItem = {
  icon: string;
  tag?: string;
  label: string;
  body: React.ReactNode;
  accent: string;
};

const norm = (a: number) => ((a % 360) + 360) % 360;
const angDist = (a: number, b: number) => {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 360 - d);
};

/**
 * A draggable dial. The ring on one side carries the items around its rim;
 * drag it (or arrow-key it) to bring an item to the marker, and the HUD on
 * the other side shows that item's detail. `side` is where the ring sits —
 * marker faces the HUD either way.
 */
export function Dial({ items, side = "left" }: { items: DialItem[]; side?: "left" | "right" }) {
  const n = items.length;
  const step = 360 / n;
  const markerDeg = side === "left" ? 90 : 270; // 3 o'clock / 9 o'clock

  const [rot, setRot] = useState(markerDeg); // item 0 starts on the marker
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);
  const lastAngle = useRef(0);

  let active = 0;
  for (let i = 1, best = angDist(rot, markerDeg); i < n; i++) {
    const d = angDist(i * step + rot, markerDeg);
    if (d < best) {
      best = d;
      active = i;
    }
  }

  const nearest = (r: number) => {
    let bestI = 0;
    for (let i = 1, best = angDist(r, markerDeg); i < n; i++) {
      const d = angDist(i * step + r, markerDeg);
      if (d < best) {
        best = d;
        bestI = i;
      }
    }
    let t = markerDeg - bestI * step;
    while (t - r > 180) t -= 360;
    while (t - r < -180) t += 360;
    return t;
  };

  const goTo = (i: number) => {
    setRot((r) => {
      let t = markerDeg - i * step;
      while (t - r > 180) t -= 360;
      while (t - r < -180) t += 360;
      return t;
    });
  };

  const angleAt = (x: number, y: number) => {
    const el = ringRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return (Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    lastAngle.current = angleAt(e.clientX, e.clientY);
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const cur = angleAt(e.clientX, e.clientY);
    let d = cur - lastAngle.current;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    lastAngle.current = cur;
    setRot((r) => r + d);
  };
  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    setRot((r) => nearest(r));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      goTo((active + 1) % n);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      goTo((active - 1 + n) % n);
    }
  };

  // idle auto-advance; pauses on hover, focus or drag, and off entirely
  // under reduced motion.
  useEffect(() => {
    if (paused || dragging) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setRot((r) => {
        // advance to the next slot from wherever we are
        let bestI = 0;
        for (let i = 1, best = angDist(r, markerDeg); i < n; i++) {
          const d = angDist(i * step + r, markerDeg);
          if (d < best) {
            best = d;
            bestI = i;
          }
        }
        const next = (bestI + 1) % n;
        let t = markerDeg - next * step;
        while (t - r > 180) t -= 360;
        while (t - r < -180) t += 360;
        return t;
      });
    }, 3600);
    return () => window.clearInterval(id);
  }, [paused, dragging, markerDeg, step, n]);

  const cur = items[active];
  const tag = cur.tag ?? `${String(active + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;

  return (
    <div
      className={`dial-block dial-block--${side}`}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className={`dial${dragging ? " is-dragging" : ""}`}
        style={{ ["--rot" as string]: `${rot}deg` }}
      >
        <svg className="dial__track" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="94" className="dial__circle" />
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const inner = i % 3 === 0 ? 82 : 88;
            return (
              <line
                key={i}
                className="dial__tick"
                x1={100 + inner * Math.cos(a)}
                y1={100 + inner * Math.sin(a)}
                x2={100 + 94 * Math.cos(a)}
                y2={100 + 94 * Math.sin(a)}
              />
            );
          })}
        </svg>

        <span className="dial__needle" aria-hidden="true" />
        <span className="dial__hub" aria-hidden="true" />

        <div
          className="dial__ring"
          ref={ringRef}
          role="slider"
          tabIndex={0}
          aria-label={`${cur.label}. Drag the dial or use arrow keys to browse ${n} items.`}
          aria-valuemin={1}
          aria-valuemax={n}
          aria-valuenow={active + 1}
          aria-valuetext={cur.label}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          {items.map((it, i) => (
            <span
              key={it.label}
              className={`dial__slot${i === active ? " is-active" : ""}`}
              style={{ ["--a" as string]: `${i * step}deg`, ["--accent" as string]: it.accent }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="dial__icon" src={`/art/icon-${it.icon}.webp`} alt="" />
            </span>
          ))}
        </div>

        <span className="dial__mark" aria-hidden="true" />
        <span className="dial__link" aria-hidden="true" />
      </div>

      <div className="hud">
        <div className="hud__frame" key={active}>
          <span className="hud__dot" aria-hidden="true" />
          <i className="hud__c hud__c--tl" aria-hidden="true" />
          <i className="hud__c hud__c--tr" aria-hidden="true" />
          <i className="hud__c hud__c--bl" aria-hidden="true" />
          <i className="hud__c hud__c--br" aria-hidden="true" />
          <p className="hud__tag">{tag}</p>
          <h3 className="hud__title" style={{ ["--accent" as string]: cur.accent }}>
            {cur.label}
          </h3>
        </div>
        <p className="hud__body" key={`b${active}`} aria-live="polite">
          {cur.body}
        </p>
      </div>
    </div>
  );
}
