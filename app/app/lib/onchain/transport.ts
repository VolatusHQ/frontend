import { fallback, http, type Transport } from "viem";

/**
 * Public Unichain Sepolia RPCs, tried first — see `unichainTransport`'s doc
 * for why. Probed 2026-09-13: all three answer chain 1301. `therpc.io`,
 * `onfinality`, `omniatech` and `routeme` returned no chain id and are left
 * out — in the rotation they would only add a timeout.
 */
const PUBLIC_RPCS = [
  "https://sepolia.unichain.org",
  "https://unichain-sepolia-rpc.publicnode.com",
  "https://unichain-sepolia.drpc.org",
];

/**
 * The public list first for *every* call, ordinary or `eth_getLogs`;
 * `NEXT_PUBLIC_UNICHAIN_SEPOLIA_RPC` (Alchemy) is appended last, as a bonus
 * fallback, never something the common path waits on. NEXT_PUBLIC_ means the
 * URL ships to the browser — restrict the key to this site's origin in the
 * provider's dashboard regardless.
 *
 * This was the other way around until a production incident traced through
 * `readMarket()`'s own request pattern: it reads the chain in ~5 sequential
 * stages (each stage's reads depend on the previous stage's result), and
 * Vercel's Hobby plan hard-caps a serverless function at 10 seconds with no
 * override. Every stage tried the keyed primary first — fine when it answers
 * in milliseconds, but a free-tier key under load doesn't always fail fast;
 * a merely *slow* response (not a clean, quick 429) gets paid in full by
 * every one of those 5 stages before any of them reaches a fallback. That
 * alone was enough to blow the 10s budget, killing the whole render and
 * leaving Vercel serving a stale ISR cache indefinitely — confirmed live via
 * `X-Vercel-Cache: STALE` persisting long after a fresh deploy, on a page
 * whose underlying chain state (`activeEpoch`) was, at the same moment,
 * genuinely fine. The public RPCs have been the reliable, boring part of
 * this stack all along; Alchemy's free tier has been the single recurring
 * source of every RPC incident today (429s, the 10-block `eth_getLogs` cap,
 * and now this) — there is no case left for trusting it with the critical
 * path over three providers with a clean track record.
 *
 * Three things this rotation exists for, all observed in production rather
 * than hypothesized:
 *
 *  1. **A free-tier key rate-limits (HTTP 429) or simply runs slow.** A
 *     single node erroring or dragging must not cost the whole call, so
 *     every method rotates to the next node in the list — a JSON-RPC error
 *     response (a provider answering "no") is caught and rotated past the
 *     same as a network failure, and a short per-node timeout bounds how
 *     long a merely slow node can hold up the chain of fallbacks.
 *  2. **Alchemy's free tier caps `eth_getLogs` at a 10-block range.** Every
 *     bounded scan in this codebase (`positions.ts`, `wallet-trades.ts`,
 *     `epoch-positions.ts`, `live-market.ts`) chunks in ~9,500-block windows
 *     to fit the public RPCs' 10,000-block cap — a range Alchemy's free tier
 *     rejects outright, every single time it's tried at all.
 *  3. **Sequential stages compound a per-node timeout fast.** With the
 *     public list first this rarely matters — the common case succeeds on
 *     the first try, every stage, in well under a second — but the timeout
 *     itself is still kept short so even a bad run through every node in a
 *     single stage can't approach Vercel's 10s ceiling on its own.
 *
 * Deliberately one pass per call, not a retry loop: an earlier version
 * re-checked `eth_blockNumber` on every node before every `eth_getLogs`
 * attempt, across up to three rounds, to protect against a lagging provider
 * returning a false empty result. That protection cost more than it was
 * worth — it turned one logical log query into as many as a dozen real HTTP
 * requests, which is what overwhelmed the RPC in an earlier production
 * incident (a page load fans out into several such queries at once). A node
 * a block or two behind now just answers with what it has; every scan in
 * this codebase is a bounded, best-effort window already; losing the last
 * block or two of it on an unlucky node is a far cheaper failure mode than a
 * request storm, or a killed function.
 */
export function unichainTransport(): Transport {
  const primary = process.env.NEXT_PUBLIC_UNICHAIN_SEPOLIA_RPC;
  // Public list first, everywhere — see the module doc for why Alchemy no
  // longer gets to be the thing every stage waits on.
  const ordinaryUrls = [...new Set([...PUBLIC_RPCS, primary].filter((u): u is string => !!u))];
  const logUrls = PUBLIC_RPCS.filter((u) => u !== primary);

  // 4s, not the original 10s: three sequential stages each falling through
  // one bad node would already cost 12s at 4s/node, over budget on its own —
  // short enough that even a full bad run through every node in a stage
  // stays well clear of Vercel's 10s ceiling, long enough that no healthy
  // public RPC observed today has ever needed more than a fraction of it.
  const NODE_TIMEOUT_MS = 4_000;
  const ordinarySingles = ordinaryUrls.map((u) => http(u, { timeout: NODE_TIMEOUT_MS, retryCount: 0 }));
  const logSingles = logUrls.map((u) => http(u, { timeout: NODE_TIMEOUT_MS, retryCount: 0 }));
  // Only used for its well-formed Transport shape (key/name/type/etc.) —
  // `request` below is what actually decides which node set a call gets.
  const ordinaryFallback = fallback(ordinarySingles, { retryCount: 1 });

  return (params) => {
    const base = ordinaryFallback(params);
    const ordinaryNodes = ordinarySingles.map((t) => t(params));
    const logNodes = (logSingles.length > 0 ? logSingles : ordinarySingles).map((t) => t(params));

    const request = (async (args: { method: string; params?: unknown }, options?: unknown) => {
      const nodes = args.method === "eth_getLogs" ? logNodes : ordinaryNodes;

      let lastError: unknown = new Error(`${args.method}: no RPC configured`);
      for (const node of nodes) {
        try {
          return await node.request(args as never, options as never);
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError;
    }) as typeof base.request;

    return { ...base, request };
  };
}
