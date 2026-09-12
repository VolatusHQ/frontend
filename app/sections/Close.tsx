import { Faq, type Qa } from "../components/Faq";
import { Reveal } from "../components/Reveal";
import { REPO_URL } from "../lib/brand";

const QA: Qa[] = [
  {
    q: "Why is this better than emissions?",
    a: "Emissions are permanent dilution, paid whether or not volatility shows up, sized by governance guesswork — and the liquidity leaves the moment they slow. A premium is pre-funded USDC, capped, over a term that ends, and it comes back if the pool stays quiet. Nothing leaves when it ends, because the risk was transferred rather than rented.",
  },
  {
    q: "Does someone have to take the other side?",
    a: "Not to start. A protocol underwriting its own pool is both sides: it mints the pair, distributes STORM to its LPs and keeps CALM. The vol pool is where it can lay that risk off later, which is why the market layer matters even though the basic flow does not need it.",
  },
  {
    q: "Where does the number actually come from?",
    a: "The pool's own tick path, accumulated in the hook on every swap. Nothing offchain, nothing signed. A Uniswap tick is already a log price, so squaring the tick delta is squaring a log return — which is exactly the quantity a variance swap settles on.",
  },
  {
    q: "Is this deployed?",
    a: "On testnets only. Unichain Sepolia and Arc Testnet, with mock tokens and test USDC — the contracts are live and the transactions are real, but do not use real funds. Every surface on this site says so because it is true.",
  },
  {
    q: "How thin is the market?",
    a: "Thin. Liquidity in the vol pool is seeded by the team and the demo counterparty is a script, so the mechanism of price discovery is demonstrated and its depth is not. That cannot be otherwise at this stage, and the README says so too.",
  },
  {
    q: "What happens if variance exceeds the cap?",
    a: "The payoff floors at 0 and caps at 1. The cap is what keeps a STORM and a CALM together worth at most one dollar, and what makes the vault solvent by construction rather than by assumption.",
  },
  {
    q: "Why not use an existing oracle?",
    a: "There isn't one for realised variance on a specific pool. And a number you have to trust someone for is a different product from a number the pool computes itself.",
  },
];

export function FaqSection() {
  return (
    <section className="section" id="faq">
      <div className="container container--narrow">
        <div className="head">
          <Reveal>
            <h2 className="h2">Frequently asked questions.</h2>
          </Reveal>
        </div>
        <Reveal>
          <Faq items={QA} />
        </Reveal>
        <Reveal delay={80}>
          <div className="faq-more">
            <div className="faq-more__text">
              <span className="faq-more__eyebrow">Still reading</span>
              <p>
                Every mechanism above has a full writeup — the accumulator, the payoff maths,
                the manipulation-cost measurement, every deployed address.
              </p>
            </div>
            <a className="btn btn--ghost" href="/docs">
              Read the docs <span aria-hidden="true">→</span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section className="section cta">
      <div className="container container--narrow">
        <Reveal>
          <h2 className="h2">The maths is in the repo.</h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="lede">Including the parts that don&rsquo;t work yet.</p>
        </Reveal>
        <Reveal delay={200}>
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
