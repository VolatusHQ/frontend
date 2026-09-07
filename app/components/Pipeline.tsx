"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The variance chain. Pulses flow along the wires while it is on screen;
 * hovering or focusing a stage lifts it and explains what happens there in
 * the caption below.
 */

type Node = { label: string; sub: string; ink: "v" | "p" | "y" | "w"; desc: React.ReactNode };

const NODES: Node[] = [
  {
    label: "swap",
    sub: "the pool",
    ink: "v",
    desc: (
      <>
        Someone trades against the pool and the <strong>tick moves</strong>.
      </>
    ),
  },
  {
    label: "Δtick",
    sub: "a log price",
    ink: "v",
    desc: (
      <>
        That move is a change in a <strong>log price</strong> — a Uniswap tick already is one.
      </>
    ),
  },
  {
    label: "Σ(Δtick)²",
    sub: "accumulator",
    ink: "p",
    desc: (
      <>
        Square it and add it up on every swap. That running sum is{" "}
        <strong>realised variance</strong>.
      </>
    ),
  },
  {
    label: "STORM · CALM",
    sub: "erc-20 pair",
    ink: "y",
    desc: (
      <>
        At epoch end the accumulated variance <strong>splits one dollar</strong> between STORM
        and CALM — the long and short legs a protocol mints to cover its own LPs.
      </>
    ),
  },
  {
    label: "impliedVol()",
    sub: "any contract",
    ink: "w",
    desc: (
      <>
        A <strong>view call</strong>. Any contract reads today&rsquo;s volatility number from it.
      </>
    ),
  },
];

const DEFAULT = "One swap, all the way to a price a protocol can buy and any contract can read.";

export function Pipeline() {
  const ref = useRef<HTMLElement>(null);
  const [running, setRunning] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure className={`pipeline-frame${running ? " is-running" : ""}`} ref={ref}>
      <div className="pl-row" role="list">
        {NODES.map((node, i) => (
          <span key={node.label} style={{ display: "contents" }}>
            <button
              type="button"
              role="listitem"
              className={`pl-node pl-node--${node.ink}${hover === i ? " is-lit" : ""}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-describedby="pl-caption"
            >
              <span className="pl-node__label">{node.label}</span>
              <span className="pl-node__sub">{node.sub}</span>
            </button>
            {i < NODES.length - 1 && (
              <span
                className="pl-wire"
                aria-hidden="true"
                style={{ ["--wd" as string]: `${i * 0.52}s` }}
              />
            )}
          </span>
        ))}
      </div>
      <figcaption className="pl-caption" id="pl-caption" aria-live="polite">
        {hover === null ? DEFAULT : NODES[hover].desc}
      </figcaption>
    </figure>
  );
}
