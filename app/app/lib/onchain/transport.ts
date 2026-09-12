import { fallback, http, type Transport } from "viem";

/**
 * Public Unichain Sepolia RPCs, rotated through after the keyed primary.
 * Probed 2026-09-13: all three answer chain 1301. `therpc.io`, `onfinality`,
 * `omniatech` and `routeme` returned no chain id and are left out.
 */
const PUBLIC_RPCS = [
  "https://sepolia.unichain.org",
  "https://unichain-sepolia-rpc.publicnode.com",
  "https://unichain-sepolia.drpc.org",
];

/**
 * `NEXT_PUBLIC_UNICHAIN_SEPOLIA_RPC` (Alchemy) first, then the public list;
 * any failure other than a contract revert or user rejection rotates to the
 * next. NEXT_PUBLIC_ means the URL ships to the browser — restrict the key
 * to this site's origin in the provider's dashboard.
 *
 * `eth_getLogs` is only sent to a node that has reached the requested
 * `toBlock`: asked for a range past its head, a node returns an empty list
 * rather than an error, which would silently drop swaps.
 */
export function unichainTransport(): Transport {
  const urls = [...new Set([process.env.NEXT_PUBLIC_UNICHAIN_SEPOLIA_RPC, ...PUBLIC_RPCS].filter((u): u is string => !!u))];
  const singles = urls.map((u) => http(u, { timeout: 10_000, retryCount: 0 }));
  const all = fallback(singles, { retryCount: 1 });

  return (params) => {
    const base = all(params);
    const nodes = singles.map((t) => t(params));

    const request = (async (args: { method: string; params?: unknown }, options?: unknown) => {
      if (args.method !== "eth_getLogs") return base.request(args as never, options as never);

      const to = (args.params as [{ toBlock?: unknown }] | undefined)?.[0]?.toBlock;
      const toBlock = typeof to === "string" && to.startsWith("0x") ? BigInt(to) : null;

      let lastError: unknown = new Error("eth_getLogs: no RPC configured");
      // `toBlock` usually comes from the fastest node's head (live-market.ts
      // reads `latest` first), so every other node can be a block or two
      // short of it. That is "early", not "down": wait and try again.
      for (let round = 0; round < 3; round++) {
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
