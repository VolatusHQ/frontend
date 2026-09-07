import { Dial, type DialItem } from "../components/Dial";
import { StraddleChart } from "../components/StraddleChart";
import { Reveal } from "../components/Reveal";
import { TAGLINE } from "../lib/brand";

const STEPS: DialItem[] = [
  {
    icon: "wave",
    accent: "var(--pink)",
    tag: "01 — MEASURE",
    label: "Measure",
    body: "The hook accumulates Σ(Δtick)² × (ln 1.0001)² on every swap, at most once per block. A Uniswap tick is already a log price, so the pool is already computing what a variance swap needs. No oracle, no feed, no committee.",
  },
  {
    icon: "spark",
    accent: "var(--yellow)",
    tag: "02 — MINT",
    label: "Mint",
    body: "One USDC mints one STORM and one CALM — ERC-20 clones, so STORM can be a v4 pool currency. STORM then trades against USDC in a second v4 pool, and that price is implied volatility.",
  },
  {
    icon: "gem",
    accent: "var(--violet)",
    tag: "03 — SETTLE",
    label: "Settle",
    body: "At the end of the epoch, accumulated variance splits the pair. Realised above the strike pays STORM, below pays CALM, and a pair redeems for at most one dollar — so the vault is solvent by construction rather than by management.",
  },
];

export function Problem() {
  return (
    <section className="section">
      <div className="container problem-block">
        <div className="problem-copy">
          <Reveal>
            <p className="eyebrow">The position you never chose</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="h2">
              Every LP is short volatility, and <em>nobody told them</em>.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p>
              Liquidity earns fees while the price sits still, and loses to impermanent loss
              when it moves — a short straddle. Past the break-even band, the position gives
              back more than the fees it made, in either direction. Protocols already pay LPs
              to hold that risk; they pay in emissions, forever, at a price nobody set.
            </p>
          </Reveal>
        </div>
        <Reveal delay={120} className="problem-viz">
          <StraddleChart />
        </Reveal>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="head">
          <Reveal>
            <p className="eyebrow">Measure · mint · settle</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="h2">How it works.</h2>
          </Reveal>
        </div>
        <Reveal>
          <Dial items={STEPS} side="right" />
        </Reveal>
      </div>
    </section>
  );
}

export function Vision() {
  return (
    <section className="section">
      <div className="container container--narrow vision">
        <Reveal>
          <h2 className="h2">Depth you buy, not depth you rent.</h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="lede">{TAGLINE}</p>
        </Reveal>
      </div>
    </section>
  );
}
