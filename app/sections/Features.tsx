import { Dial, type DialItem } from "../components/Dial";
import { ScrollFlow } from "../components/ScrollFlow";
import { Reveal } from "../components/Reveal";

const FEATURES: DialItem[] = [
  {
    icon: "coins",
    accent: "var(--pink)",
    label: "Underwrite your own pool",
    body: "Post USDC, mint pairs, hand STORM to LPs in place of emissions and keep CALM. If the pool stays quiet the collateral comes back. Nobody else has to show up for this to work.",
  },
  {
    icon: "gem",
    accent: "var(--yellow)",
    label: "A cost that stops compounding",
    body: "Emissions are permanent dilution, paid whether or not the risk lands, sized by governance guesswork. A premium is pre-funded, capped at the strike-to-cap band, and ends when the term ends.",
  },
  {
    icon: "bolt",
    accent: "var(--violet)",
    label: "One function to read",
    body: (
      <>
        <code>impliedVol()</code> is a view call. Every dynamic-fee hook estimates volatility
        from a trailing window because nothing else exists; this number is the market&rsquo;s,
        and it looks forward.
      </>
    ),
  },
];

export function Flow() {
  return (
    <section className="section section--tight">
      <div className="container">
        {/* Not wrapped in <Reveal>: it drives its own scroll-linked state,
            and a transformed ancestor would break the sticky panel inside
            it (a `transform` on any ancestor creates a new containing
            block, which position: sticky resolves against). */}
        <ScrollFlow />
      </div>
    </section>
  );
}

export function Features() {
  return (
    <section className="section">
      <div className="container">
        <div className="head">
          <Reveal>
            <h2 className="h2">A premium, paid in inflation.</h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="lede">
              Every liquidity mining program buys the same thing: LPs bearing impermanent loss.
              Volatus lets a protocol buy it as insurance instead — at a market price, in
              stablecoins, for a term that ends.
            </p>
          </Reveal>
        </div>
        <Reveal>
          <Dial items={FEATURES} side="left" />
        </Reveal>
      </div>
    </section>
  );
}
