import type { Metadata } from "next";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { MechanismFlow } from "./MechanismFlow";
import { BRAND, REPO_URL } from "../lib/brand";
import { DocsChrome, type DocSection } from "./DocsChrome";
import { CopyButton } from "./CopyButton";
import {
  SIGMA_HOOK,
  SIGMA_VAULT,
  SIGMA_ORACLE,
  VARIANCE_TOKEN_IMPL,
  POOL_MANAGER,
  SIGMA_STREAM,
  ARC_USDC,
  LIVE_EPOCH_ID,
} from "../app/lib/onchain/addresses";

export const metadata: Metadata = {
  title: `Docs — ${BRAND}`,
  description:
    "The full mechanism: measurement, price discovery, settlement, manipulation resistance, every deployed address.",
};

const SECTIONS: DocSection[] = [
  { id: "overview", label: "Overview" },
  { id: "sides", label: "Who's on each side" },
  { id: "problem", label: "The problem" },
  { id: "mechanism", label: "The mechanism" },
  { id: "resistance", label: "Manipulation resistance" },
  { id: "architecture", label: "Architecture" },
  { id: "surface", label: "Contract surface" },
  { id: "deployments", label: "Deployments" },
  { id: "agents", label: "Agents & delegation" },
  { id: "limitations", label: "Limitations" },
];

const UNISCAN = "https://sepolia.uniscan.xyz/address/";

function Code({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="code-block">
      <div className="code-block__bar">
        <span>{lang ?? "solidity"}</span>
        <CopyButton value={code} />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function AddressRow({
  name,
  address,
  chain,
  note,
}: {
  name: string;
  address: string;
  chain: "unichain" | "arc";
  note?: string;
}) {
  return (
    <div className="addr-row">
      <div className="addr-row__name">
        <span>{name}</span>
        {note ? <span className="addr-row__note">{note}</span> : null}
      </div>
      <code className="addr-row__value">{address}</code>
      <div className="addr-row__actions">
        <CopyButton value={address} />
        {chain === "unichain" ? (
          <a className="addr-row__explorer" href={`${UNISCAN}${address}`} target="_blank" rel="noreferrer">
            View ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section docs-hero">
          <div className="container">
            <Reveal>
              <span className="eyebrow">Documentation</span>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="h1 docs-hero__title">
                A price for volatility, <em>measured by the pool itself.</em>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="lede docs-hero__lede">
                Every mechanism in {BRAND}, in the order a skeptic would want to check it: the
                measurement, the price, the settlement, the attack it resists, and the addresses
                where all of it is actually deployed.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <div className="btn-row docs-hero__row">
                <a className="btn btn--primary" href="/app">
                  Open app
                </a>
                <a className="btn btn--ghost" href={REPO_URL} target="_blank" rel="noreferrer">
                  Source
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <div className="container docs-container">
          <DocsChrome sections={SECTIONS}>
            {/* ---------------------------------------------------------- */}
            <section id="overview" className="docs-section">
              <Reveal>
                <h2 className="h3 docs-h">The 30-second version</h2>
              </Reveal>
              <Reveal delay={60}>
                <p className="docs-p">
                  A protocol pays LPs to bear impermanent loss by emitting tokens forever. That is
                  a premium, paid in the worst possible currency. Volatus lets a protocol buy the
                  same risk transfer as insurance instead — priced by a market, settled in USDC,
                  for a term that ends.
                </p>
              </Reveal>
              <Reveal delay={100}>
                <ol className="docs-steps">
                  <li>
                    A v4 hook measures how much a pool is actually moving, straight from its own
                    swap data. <strong>No oracle.</strong>
                  </li>
                  <li>
                    Two tokens trade against that measurement — <strong>STORM</strong> pays out
                    when it moves, <strong>CALM</strong> pays out when it stays quiet. What they
                    trade at <em>is</em> implied volatility.
                  </li>
                  <li>
                    A treasury buys STORM for its LPs, or takes the other side itself: post USDC,
                    mint pairs, hand STORM to LPs in place of emissions, keep CALM.
                  </li>
                </ol>
              </Reveal>
              <Reveal delay={140}>
                <blockquote className="docs-quote">
                  Liquidity mining is an insurance premium paid in inflation. Volatus turns it
                  into a market.
                </blockquote>
              </Reveal>
            </section>

            {/* ---------------------------------------------------------- */}
            <section id="sides" className="docs-section">
              <Reveal>
                <h2 className="h3 docs-h">Who&rsquo;s on each side</h2>
              </Reveal>
              <Reveal delay={60}>
                <div className="docs-table-wrap">
                  <table className="docs-table">
                    <thead>
                      <tr>
                        <th>Actor</th>
                        <th>Puts in</th>
                        <th>Gets out</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Protocol treasury (buyer)</td>
                        <td>USDC premium</td>
                        <td>LPs hedged, without emissions</td>
                      </tr>
                      <tr>
                        <td>Token owner as underwriter</td>
                        <td>USDC collateral</td>
                        <td>STORM to distribute, CALM retained</td>
                      </tr>
                      <tr>
                        <td>Liquidity provider</td>
                        <td>Nothing, or a small premium</td>
                        <td>Fee yield with the price risk stripped out</td>
                      </tr>
                      <tr>
                        <td>Volatility seller</td>
                        <td>Buys CALM</td>
                        <td>Premium income, loss capped by design</td>
                      </tr>
                      <tr>
                        <td>Any protocol</td>
                        <td>One view call</td>
                        <td>Market-implied volatility</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <p className="docs-p">
                  The second row matters most for bootstrapping: a protocol underwriting its own
                  pool needs no counterparty at all. It mints both legs, keeps one, distributes
                  the other — that path works on day one, with nobody else in the market.
                </p>
              </Reveal>
            </section>

            {/* ---------------------------------------------------------- */}
            <section id="problem" className="docs-section">
              <Reveal>
                <h2 className="h3 docs-h">The problem</h2>
              </Reveal>
              <Reveal delay={60}>
                <div className="docs-table-wrap">
                  <table className="docs-table">
                    <thead>
                      <tr>
                        <th />
                        <th>Emissions</th>
                        <th>What insurance should be</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Cost</td>
                        <td>Permanent dilution, paid regardless</td>
                        <td>Pay for realized risk</td>
                      </tr>
                      <tr>
                        <td>Pricing</td>
                        <td>Set by governance guesswork</td>
                        <td>Set by a market</td>
                      </tr>
                      <tr>
                        <td>Duration</td>
                        <td>Compounds forever</td>
                        <td>Ends when the term ends</td>
                      </tr>
                      <tr>
                        <td>Retention</td>
                        <td>Liquidity leaves when emissions slow</td>
                        <td>Nothing to leave — risk transferred, not rented</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <p className="docs-p">
                  A concentrated liquidity position is, in payoff terms, a short straddle: fees
                  collected as premium, losses in either direction. LPs are short gamma and were
                  never told, and nothing lets them know how much, buy protection against it, or
                  price that protection — outside BTC/ETH, nowhere.
                </p>
              </Reveal>
            </section>

            {/* ---------------------------------------------------------- */}
            <section id="mechanism" className="docs-section">
              <Reveal>
                <h2 className="h3 docs-h">The mechanism</h2>
              </Reveal>
              <Reveal delay={60}>
                <p className="docs-p">
                  Three layers. The first two live on Uniswap; the third is a payment rail.
                </p>
              </Reveal>
              <Reveal delay={100}>
                <MechanismFlow />
              </Reveal>

              <div className="docs-subgrid">
                <Reveal>
                  <div>
                    <h3 className="docs-h4">Layer 1 — measurement</h3>
                    <p className="docs-p">
                      A Uniswap tick is already a log price: <code>tick = log₁.₀₀₀₁(price)</code>.
                      Realized variance is a sum of squared tick deltas — no logs, no oracle, no
                      external feed.
                    </p>
                    <Code
                      lang="solidity"
                      code={`realizedVariance(epoch) = Σ (Δtickᵢ)² × (ln 1.0001)²`}
                    />
                  </div>
                </Reveal>
                <Reveal delay={60}>
                  <div>
                    <h3 className="docs-h4">Layer 2 — settlement</h3>
                    <p className="docs-p">
                      Strike <code>K</code> and cap <code>C</code> normalize the accumulator into
                      a payoff in <code>[0, 1]</code>. Both legs floor independently, so the pair
                      can never redeem for more than 1 USDC combined.
                    </p>
                    <Code
                      lang="solidity"
                      code={`V = accumulator * (ln 1.0001)^2\np = clamp(V - K, 0, C - K) / (C - K)`}
                    />
                    <div className="docs-payoff">
                      <div className="docs-payoff__row">
                        <span className="docs-payoff__leg">
                          STORM <span className="docs-payoff__sub">VAR-LONG</span>
                        </span>
                        <span className="docs-payoff__value">
                          redeems for <code>p</code> USDC
                        </span>
                      </div>
                      <div className="docs-payoff__row">
                        <span className="docs-payoff__leg">
                          CALM <span className="docs-payoff__sub">VAR-SHORT</span>
                        </span>
                        <span className="docs-payoff__value">
                          redeems for <code>1 − p</code> USDC
                        </span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>

              <Reveal delay={100}>
                <div>
                  <h3 className="docs-h4">Layer 3 — coverage as a subscription</h3>
                  <p className="docs-p">
                    Circle Nanopayments removes the batching floor — gas-free USDC transfers down
                    to $0.000001, verified in under a second, batched onchain later. A treasury
                    streams premium per second at the prevailing market IV; coverage accrues tick
                    by tick and lapses the moment the stream stops. No term, no expiry, no
                    lockup.
                  </p>
                </div>
              </Reveal>
            </section>

            {/* ---------------------------------------------------------- */}
            <section id="resistance" className="docs-section">
              <Reveal>
                <h2 className="h3 docs-h">Manipulation resistance</h2>
              </Reveal>
              <Reveal delay={60}>
                <p className="docs-p">
                  The index settles money, so it has to resist a STORM holder wash-trading the
                  pool to manufacture variance. Three structural defenses, and the second one is
                  measured, not argued.
                </p>
              </Reveal>

              <div className="docs-stat-row">
                <Reveal>
                  <div className="docs-stat">
                    <span className="docs-stat__label">One observation per block</span>
                    <span className="docs-stat__body">
                      Intra-block round trips contribute nothing — the cheapest attack is
                      eliminated outright, not merely made expensive.
                    </span>
                  </div>
                </Reveal>
                <Reveal delay={60}>
                  <div className="docs-stat docs-stat--big">
                    <span className="docs-stat__label">Break-even multiple</span>
                    <span className="docs-stat__num">694×</span>
                    <span className="docs-stat__body">
                      Ten round trips across twenty blocks cost 0.30 units of currency and moved
                      the payoff 0.00144 — an attacker needs 694× the attack&rsquo;s cost in
                      STORM before manufacturing variance breaks even.{" "}
                      <code>test/fuzz/ManipulationCost.t.sol</code>.
                    </span>
                  </div>
                </Reveal>
                <Reveal delay={120}>
                  <div className="docs-stat">
                    <span className="docs-stat__label">Per-observation clamping</span>
                    <span className="docs-stat__body">
                      <code>MAX_TICK_DELTA</code> bounds any single observation, so a one-block
                      dislocation cannot dominate an epoch.
                    </span>
                  </div>
                </Reveal>
              </div>
              <Reveal delay={160}>
                <p className="docs-p docs-p--quiet">
                  The honest form of the claim is conditional: there is always some position large
                  enough to fund an attack. The defenses put it multiple orders of magnitude above
                  the attack&rsquo;s cost, not out of reach in principle.
                </p>
              </Reveal>
            </section>

            {/* ---------------------------------------------------------- */}
            <section id="architecture" className="docs-section">
              <Reveal>
                <h2 className="h3 docs-h">Architecture</h2>
              </Reveal>
              <Reveal delay={60}>
                <p className="docs-p">
                  Two chains, two jobs. The index, the collateral and settlement live entirely on
                  Unichain. Arc is a payment rail for a subscription — never part of settlement.
                </p>
              </Reveal>
              <div className="docs-cols">
                <Reveal>
                  <div className="docs-plate">
                    <span className="docs-plate__tag">Unichain Sepolia</span>
                    <h3 className="docs-h4">Measurement · price discovery · settlement</h3>
                    <ul className="docs-list">
                      <li>Underlying v4 pool — every swap moves the tick</li>
                      <li><code>VolatusHook</code> — accumulates variance in <code>afterSwap</code></li>
                      <li><code>VolatusVault</code> — mint / burn / settle, holds USDC collateral</li>
                      <li>Variance v4 pool — STORM / USDC, where IV is discovered</li>
                      <li><code>VolatusOracle</code> — <code>impliedVol()</code>, the public feed</li>
                    </ul>
                  </div>
                </Reveal>
                <Reveal delay={80}>
                  <div className="docs-plate">
                    <span className="docs-plate__tag">Arc Testnet</span>
                    <h3 className="docs-h4">Streaming premium — the payment rail only</h3>
                    <ul className="docs-list">
                      <li><code>VolatusStream</code> — subscription registry, coverage accrual</li>
                      <li>Underwriter capacity, posted in USDC</li>
                      <li>USDC is simultaneously native gas and an ERC-20 — same funds, two views</li>
                      <li>A permissionless <code>sync</code> keeper, gated on gas-vs-premium economics</li>
                      <li>If Arc is unavailable, streams stop and coverage lapses — nothing is stuck</li>
                    </ul>
                  </div>
                </Reveal>
              </div>
              <Reveal delay={120}>
                <div>
                  <h3 className="docs-h4">Epoch lifecycle</h3>
                  <div className="docs-lifecycle">
                    {["Open", "Mint / trade / accrue", "Frozen", "Settled", "Redeemed"].map(
                      (step, i, arr) => (
                        <span key={step} className="docs-lifecycle__item">
                          <span className="docs-lifecycle__node">{step}</span>
                          {i < arr.length - 1 && (
                            <span className="docs-lifecycle__arrow" aria-hidden="true">
                              →
                            </span>
                          )}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </Reveal>
            </section>

            {/* ---------------------------------------------------------- */}
            <section id="surface" className="docs-section">
              <Reveal>
                <h2 className="h3 docs-h">Contract surface</h2>
              </Reveal>
              <Reveal delay={60}>
                <p className="docs-p">
                  The integration point for any other protocol is one view call. Everything else
                  is the vault a treasury actually calls.
                </p>
              </Reveal>
              <Reveal delay={100}>
                <Code
                  code={`interface IVolatusOracle {\n    /// Market-implied volatility for a pool, annualized, 1e18 fixed point.\n    function impliedVol(PoolId id) external view returns (uint256);\n\n    /// Realized variance accumulated so far in the current epoch.\n    function realizedVariance(PoolId id) external view returns (uint256);\n\n    function epoch(PoolId id)\n        external view returns (uint64 endBlock, uint256 strike, uint256 cap);\n}`}
                />
              </Reveal>
              <Reveal delay={140}>
                <Code
                  code={`interface IVolatusVault {\n    /// Deposit \`amount\` USDC, receive \`amount\` of each leg.\n    function mintPair(PoolId id, uint256 amount) external;\n\n    /// Return one of each leg before settlement, receive USDC back.\n    function burnPair(PoolId id, uint256 amount) external;\n\n    /// Freeze the payoff from the accumulator. Permissionless after endBlock.\n    function settle(PoolId id) external returns (uint256 payoffX18);\n\n    /// Redeem a settled leg for its share of collateral.\n    function redeem(PoolId id, bool long, uint256 amount) external;\n}`}
                />
              </Reveal>
              <Reveal delay={180}>
                <p className="docs-p docs-p--quiet">
                  One line reads the whole feed:{" "}
                  <code>uint256 iv = volatusOracle.impliedVol(poolId);</code>
                </p>
              </Reveal>
            </section>

            {/* ---------------------------------------------------------- */}
            <section id="deployments" className="docs-section">
              <Reveal>
                <h2 className="h3 docs-h">Deployments</h2>
              </Reveal>
              <Reveal delay={60}>
                <p className="docs-p">
                  Live, testnet only. These are the same constants the app and the backend
                  services read — one source of truth, so this list cannot drift from what is
                  actually deployed.
                </p>
              </Reveal>

              <Reveal delay={100}>
                <div>
                  <span className="chain-badge chain-badge--unichain">Unichain Sepolia · 1301</span>
                  <div className="addr-list">
                    <AddressRow name="VolatusOracle" address={SIGMA_ORACLE} chain="unichain" note="integration point" />
                    <AddressRow name="VolatusHook" address={SIGMA_HOOK} chain="unichain" />
                    <AddressRow name="VolatusVault" address={SIGMA_VAULT} chain="unichain" />
                    <AddressRow name="VarianceToken impl." address={VARIANCE_TOKEN_IMPL} chain="unichain" note="cloned per leg" />
                    <AddressRow name="PoolManager" address={POOL_MANAGER} chain="unichain" note="Uniswap v4" />
                  </div>
                </div>
              </Reveal>

              <Reveal delay={140}>
                <div>
                  <span className="chain-badge chain-badge--arc">Arc Testnet · 5042002</span>
                  <div className="addr-list">
                    <AddressRow name="VolatusStream" address={SIGMA_STREAM} chain="arc" note={`live epoch ${LIVE_EPOCH_ID}`} />
                    <AddressRow name="USDC (ERC-20 view)" address={ARC_USDC} chain="arc" note="also native gas, 18dp" />
                  </div>
                </div>
              </Reveal>

              <Reveal delay={180}>
                <p className="docs-p docs-p--quiet">
                  Read the number yourself:{" "}
                  <code>cast call {SIGMA_ORACLE} &quot;impliedVol(bytes32)(uint256)&quot; &lt;poolId&gt; --rpc-url https://sepolia.unichain.org</code>
                </p>
              </Reveal>
            </section>

            {/* ---------------------------------------------------------- */}
            <section id="agents" className="docs-section">
              <Reveal>
                <h2 className="h3 docs-h">Agents & delegation</h2>
              </Reveal>
              <Reveal delay={60}>
                <p className="docs-p">
                  Two agents hold Circle Wallets and act on signals read from the contracts
                  above, not from prompts. A continuously-priced market only exists if both sides
                  reprice every tick — no human requotes a volatility surface every second.
                </p>
              </Reveal>
              <Reveal delay={100}>
                <div className="docs-table-wrap">
                  <table className="docs-table">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Signal</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Hedger (treasury side)</td>
                        <td>Gamma exposure × live accumulator; IV from the vol pool</td>
                        <td>Adjusts streamed rate and coverage notional within the mandate</td>
                      </tr>
                      <tr>
                        <td>Underwriter (seller side)</td>
                        <td>Realized vs implied spread; inventory concentration</td>
                        <td>Requotes offered rate; withdraws capacity as risk concentrates</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Reveal>
              <Reveal delay={140}>
                <p className="docs-p">
                  Privy secures the delegation. The agent signs with a session signer under a
                  TEE-enforced policy — a compromised backend cannot move a treasury&rsquo;s funds
                  anywhere except into premium payments on the pool it authorized, and cannot
                  exceed the mandate.
                </p>
              </Reveal>
              <Reveal delay={180}>
                <Code
                  lang="policy"
                  code={`Policy: volatus-hedger-v1\n  |- allow  method: streamPremium | adjustCoverage\n  |- allow  target: VolatusStream only\n  |- deny   all ERC20 transfers to other recipients\n  |- cap    cumulative spend <= declared mandate`}
                />
              </Reveal>
            </section>

            {/* ---------------------------------------------------------- */}
            <section id="limitations" className="docs-section">
              <Reveal>
                <h2 className="h3 docs-h">Limitations</h2>
              </Reveal>
              <Reveal delay={60}>
                <p className="docs-p">
                  Stated plainly, because a judge will find them anyway.
                </p>
              </Reveal>
              <Reveal delay={100}>
                <ul className="docs-list docs-list--limits">
                  <li>Testnet only, on Unichain Sepolia and Arc Testnet. Nothing here moves real funds.</li>
                  <li>
                    Liquidity in the vol pool is seeded by the team and the demo counterparty is a
                    script — the mechanism of price discovery is demonstrated, its depth is not.
                  </li>
                  <li>
                    The reporter that mirrors settlement onto Arc is a single held key today, not
                    a multisig — the one privileged role in the system.
                  </li>
                  <li>
                    Manipulation resistance is measured against a specific attack shape, not
                    proven against every conceivable one — see <code>ManipulationCost.t.sol</code>.
                  </li>
                </ul>
              </Reveal>
              <Reveal delay={140}>
                <div className="docs-end">
                  <a className="btn btn--primary" href="/app">
                    Open app
                  </a>
                  <a className="btn btn--ghost" href="/#faq">
                    Back to FAQ
                  </a>
                  <a className="btn btn--ghost" href={REPO_URL} target="_blank" rel="noreferrer">
                    Full source →
                  </a>
                </div>
              </Reveal>
            </section>
          </DocsChrome>
        </div>
      </main>
      <Footer />
    </>
  );
}
