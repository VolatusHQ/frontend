import { fallback, http, type Transport } from "viem";

/**
 * Public Unichain Sepolia RPCs, tried after (or, for `eth_getLogs`, instead
 * of) the keyed primary. Probed 2026-09-13: all three answer chain 1301.
 * `therpc.io`, `onfinality`, `omniatech` and `routeme` returned no chain id
 * and are left out — in the rotation they would only add a timeout.
 */
const PUBLIC_RPCS = [
  "https://sepolia.unichain.org",
  "https://unichain-sepolia-rpc.publicnode.com",
  "https://unichain-sepolia.drpc.org",
];

/**
 * `NEXT_PUBLIC_UNICHAIN_SEPOLIA_RPC` (Alchemy) first for ordinary calls, then
 * the public list; every request tries each node in turn until one answers.
 * NEXT_PUBLIC_ means the URL ships to the browser — restrict the key to this
 * site's origin in the provider's dashboard.
 *
 * Two things this rotation exists for, both observed in production rather
 * than hypothesized:
 *
 *  1. **A free-tier key rate-limits (HTTP 429).** A single node timing out or
 *     erroring must not fail the call outright, so every method is retried
 *     against the next node in the list rather than trusting any one
 *     transport's own retry policy — a JSON-RPC error response (a provider
 *     answering "no" is not the same as a provider being down) is caught and
 *     rotated past the same as a network failure.
 *  2. **Alchemy's free tier caps `eth_getLogs` at a 10-block range.** Every
 *     bounded scan in this codebase (`positions.ts`, `wallet-trades.ts`,
 *     `epoch-positions.ts`, `live-market.ts`) chunks in ~9,500-block windows
 *     to fit the public RPCs' 10,000-block cap — a range Alchemy's free tier
 *     rejects outright, every single time. Retrying it there first would be
 *     pure overhead at best; `eth_getLogs` skips straight to the public list
 *     via a separate node set (`logNodes`) that excludes it entirely.
 *
 * `eth_getLogs` gets one more rule on top: asked for a `toBlock` past its own
 * head, a node returns an empty list for the whole range rather than an
 * error, and providers' heads differ by a few blocks — so a block number read
 * from the fastest node and logs read from a slower one would silently lose
 * events. A log query is only sent to a node that has reached its `toBlock`;
 * otherwise it waits and tries again rather than returning a false empty.
 */
export function unichainTransport(): Transport {
  const primary = process.env.NEXT_PUBLIC_UNICHAIN_SEPOLIA_RPC;
  const ordinaryUrls = [...new Set([primary, ...PUBLIC_RPCS].filter((u): u is string => !!u))];
  // Alchemy excluded, not merely deprioritized — seeing it in the list at all
  // guarantees a failed round trip for a query this codebase's ranges will
  // always exceed.
  const logUrls = PUBLIC_RPCS.filter((u) => u !== primary);

  const ordinarySingles = ordinaryUrls.map((u) => http(u, { timeout: 10_000, retryCount: 0 }));
  const logSingles = logUrls.map((u) => http(u, { timeout: 10_000, retryCount: 0 }));
  // Only used for its well-formed Transport shape (key/name/type/etc.) —
  // `request` below is what actually decides which node set and rotation
  // rule a call gets, for every method, not only `eth_getLogs`.
  const ordinaryFallback = fallback(ordinarySingles, { retryCount: 1 });

  return (params) => {
    const base = ordinaryFallback(params);
    const ordinaryNodes = ordinarySingles.map((t) => t(params));
    const logNodes = (logSingles.length > 0 ? logSingles : ordinarySingles).map((t) => t(params));

    const request = (async (args: { method: string; params?: unknown }, options?: unknown) => {
      const isGetLogs = args.method === "eth_getLogs";
      const nodes = isGetLogs ? logNodes : ordinaryNodes;

      const to = isGetLogs ? (args.params as [{ toBlock?: unknown }] | undefined)?.[0]?.toBlock : undefined;
      const toBlock = typeof to === "string" && to.startsWith("0x") ? BigInt(to) : null;

      let lastError: unknown = new Error(`${args.method}: no RPC configured`);
      // Only `eth_getLogs` needs the head-catch-up dance; every other method
      // is a single pass through the node list.
      const rounds = isGetLogs ? 3 : 1;
      for (let round = 0; round < rounds; round++) {
        let anyBehind = false;
        for (const node of nodes) {
          try {
            if (toBlock !== null) {
              const head = BigInt((await node.request({ method: "eth_blockNumber" })) as string);
              if (head < toBlock) {
                anyBehind = true;
                lastError = new Error(`RPC head ${head} is behind the requested toBlock ${toBlock}`);
                continue;
              }
            }
            return await node.request(args as never, options as never);
          } catch (err) {
            lastError = err;
          }
        }
        if (!anyBehind) break;
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }
      throw lastError;
    }) as typeof base.request;

    return { ...base, request };
  };
}
