/**
 * A static, docs-column-safe restatement of the landing page's mechanism
 * flow (`ScrollFlow`, in the `Flow` section). That component is a tall,
 * scroll-driven section built for the full page — wrong shape for a docs
 * content column, which is narrower and reached by a reader scanning top to
 * bottom rather than scrolling through a dedicated section. This states
 * every step's caption up front instead, as one flowing list.
 */

type Step = { label: string; sub: string; ink: "violet" | "pink" | "yellow" | "bone"; desc: string };

const STEPS: Step[] = [
  { label: "swap", sub: "the pool", ink: "violet", desc: "Someone trades against the pool and the tick moves." },
  { label: "Δtick", sub: "a log price", ink: "violet", desc: "That move is a change in a log price — a Uniswap tick already is one." },
  { label: "Σ(Δtick)²", sub: "accumulator", ink: "pink", desc: "Squared and added on every swap. That running sum is realized variance." },
  { label: "STORM · CALM", sub: "erc-20 pair", ink: "yellow", desc: "At epoch end the accumulated variance splits one dollar between the two legs." },
  { label: "impliedVol()", sub: "any contract", ink: "bone", desc: "A view call. Any contract reads today's volatility number from it." },
];

export function MechanismFlow() {
  return (
    <ol className="docs-flow">
      {STEPS.map((step, i) => (
        <li key={step.label} className="docs-flow__item">
          <div className={`docs-flow__node docs-flow__node--${step.ink}`}>
            <span className="docs-flow__label">{step.label}</span>
            <span className="docs-flow__sub">{step.sub}</span>
            <p className="docs-flow__desc">{step.desc}</p>
          </div>
          {i < STEPS.length - 1 && (
            <span className="docs-flow__arrow" aria-hidden="true">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
