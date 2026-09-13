"use client";

import { useEffect, useRef } from "react";

/**
 * The epoch mechanism, six steps, driven by scroll. A spine on the sticky
 * left panel fills continuously with scroll position while the matching
 * node lights up; the reading column on the right advances in lockstep.
 * This is the page's one scroll-linked driver — DESIGN.md 7.5 budgets one.
 *
 * Falls back to a fully "connected" static state — spine filled, every
 * node settled — under `prefers-reduced-motion: reduce` or below the
 * 880px breakpoint where the sticky panel drops out. See `update()`.
 */

type Step = {
  title: string;
  sub: string;
  tech: React.ReactNode;
  stepTitle: string;
  body: React.ReactNode;
};

const STEPS: Step[] = [
  {
    title: "Pool",
    sub: "trading, as usual",
    tech: "the measured pool",
    stepTitle: "The pool trades",
    body: "Someone trades against the pool and the tick moves. Nothing here is new — it's just a pool doing what pools do.",
  },
  {
    title: "Hook",
    sub: "watches every swap",
    tech: <span className="c-yellow">accumulator += (Δtick)²</span>,
    stepTitle: "The hook watches",
    body: "VolatusHook sits on the pool. Every swap that moves the tick, it takes note — once per block, straight from the pool's own price. No oracle, no feed.",
  },
  {
    title: "Variance score",
    sub: "bigger moves, bigger number",
    tech: <span className="c-yellow">V = Σ(Δtick)² · (ln 1.0001)²</span>,
    stepTitle: "Moves become a score",
    body: (
      <>
        Squared and added on every swap. That running sum is{" "}
        <span className="c-yellow">realized variance</span> — a plain measurement of how much
        the pool actually moved.
      </>
    ),
  },
  {
    title: "Mint the pair",
    sub: "1 USDC → two new tokens",
    tech: (
      <>
        <span className="c-violet">USDC</span> → <span className="c-pink">STORM</span> +{" "}
        <span className="c-yellow">CALM</span>
      </>
    ),
    stepTitle: "Two tokens, one deposit",
    body: (
      <>
        Once an epoch, 1 <span className="c-violet">USDC</span> mints one{" "}
        <span className="c-pink">STORM</span> and one <span className="c-yellow">CALM</span> —
        STORM pays out if things got wild, CALM if they stayed calm. Together they&rsquo;re never
        worth more than that 1 USDC.
      </>
    ),
  },
  {
    title: "Vol pool",
    sub: "STORM / USDC, priced live",
    tech: (
      <>
        price = <span className="c-pink">implied volatility</span>
      </>
    ),
    stepTitle: "Price becomes volatility",
    body: "STORM trades against USDC in a second, brand-new v4 pool. Whatever it trades for is the market's live guess at how volatile things will get.",
  },
  {
    title: "Settlement",
    sub: "the real score pays out",
    tech: (
      <>
        p = clamp(<span className="c-yellow">V</span>−<span className="c-violet">K</span>,0,
        <span className="c-violet">C</span>−<span className="c-violet">K</span>)/(
        <span className="c-violet">C</span>−<span className="c-violet">K</span>)
      </>
    ),
    stepTitle: "The score decides",
    body: (
      <>
        <span className="c-pink">STORM</span> redeems its share, <span className="c-yellow">CALM</span>{" "}
        redeems the rest — and the two never add up to more than the USDC that funded them. Any
        contract reads the result with <code>impliedVol()</code>, one view call.
      </>
    ),
  },
];

export function ScrollFlow() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const fill = fillRef.current;
    if (!section || !fill) return;

    const N = STEPS.length;
    const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqNarrow = window.matchMedia("(max-width: 880px)");

    const setStatic = () => {
      fill.style.height = "100%";
      nodeRefs.current.forEach((n) => {
        if (!n) return;
        n.classList.remove("is-current");
        n.classList.add("is-passed");
      });
      stepRefs.current.forEach((s) => s?.classList.remove("is-active"));
      if (labelRef.current) labelRef.current.textContent = `0${N} / 0${N}`;
    };

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    const update = () => {
      if (mqReduced.matches || mqNarrow.matches) {
        setStatic();
        return;
      }

      const rect = section.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const raw = scrollable > 0 ? (0 - rect.top) / scrollable : rect.top <= 0 ? 1 : 0;
      const progress = clamp(raw, 0, 1);
      const cursor = progress * (N - 1);
      const nearest = Math.round(cursor);

      fill.style.height = `${progress * 100}%`;

      nodeRefs.current.forEach((n, i) => {
        if (!n) return;
        n.classList.remove("is-current", "is-passed");
        if (i < nearest) n.classList.add("is-passed");
        else if (i === nearest) n.classList.add("is-current");
      });
      stepRefs.current.forEach((s, i) => s?.classList.toggle("is-active", i === nearest));
      if (labelRef.current) {
        labelRef.current.textContent = `0${nearest + 1} / 0${N}`;
      }
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    mqReduced.addEventListener("change", update);
    mqNarrow.addEventListener("change", update);
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mqReduced.removeEventListener("change", update);
      mqNarrow.removeEventListener("change", update);
    };
  }, []);

  return (
    <div className="scroll-flow" ref={sectionRef}>
      <div className="scroll-flow__grid">
        <div className="scroll-flow__visual">
          <div className="scroll-flow__panel">
            <p className="scroll-flow__kicker">
              One epoch <span ref={labelRef}>01 / 06</span>
            </p>

            <div className="scroll-flow__track">
              <div className="scroll-flow__fill" ref={fillRef} />
              {STEPS.map((step, i) => (
                <div
                  className="scroll-flow__node"
                  key={step.title}
                  ref={(el) => {
                    nodeRefs.current[i] = el;
                  }}
                >
                  <span className="scroll-flow__dot" />
                  <p className="scroll-flow__node-title">{step.title}</p>
                  <p className="scroll-flow__node-sub">{step.sub}</p>
                  <p className="scroll-flow__node-tech">{step.tech}</p>
                </div>
              ))}
            </div>

            <p className="scroll-flow__loop">↻ repeats — a new epoch opens right after</p>
          </div>
        </div>

        <div className="scroll-flow__steps">
          {STEPS.map((step, i) => (
            <div
              className="scroll-flow__step"
              key={step.stepTitle}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
            >
              <p className="scroll-flow__step-no">{`0${i + 1}`}</p>
              <h3>{step.stepTitle}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
