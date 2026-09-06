import { BRAND, REPO_URL } from "../lib/brand";
import { Reveal } from "../components/Reveal";

export function Hero() {
  return (
    <section className="section hero" id="top">
      <div className="container hero__inner">
        <Reveal>
          <p className="eyebrow">A Uniswap v4 hook</p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="h1">
            Every protocol already pays for volatility. <em>None of them know the price.</em>
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="lede">
            {BRAND} turns liquidity mining into a market. A protocol buys the impermanent-loss
            risk off its LPs at a discovered price, in USDC — instead of renting liquidity with
            permanent token emissions.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="btn-row">
            <a className="btn btn--primary" href="/app">
              Open app
            </a>
            <a className="btn btn--ghost" href={REPO_URL} target="_blank" rel="noreferrer">
              Read the spec
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
