import { createPublicClient, http } from "viem";
import { arcTestnet, unichainSepolia } from "./chains";

/**
 * One read-only client per chain, created at module scope so a request does
 * not pay for a new transport. Read-only on purpose: nothing in the app
 * writes yet (PHASES.md phase 4 adds wallet connect and the write paths), so
 * there is no wallet client and no connector dependency here.
 *
 * `batch: true` collapses the several reads a panel needs into one
 * eth_call multicall round trip where the RPC supports it.
 */

// Deliberately not NEXT_PUBLIC_: the value is read only on the server, so a
// keyed provider URL never reaches the browser bundle. Client-side reads fall
// back to the chain's public RPC.
export const unichainClient = createPublicClient({
  chain: unichainSepolia,
  transport: http(process.env.UNICHAIN_SEPOLIA_RPC || undefined, { timeout: 10_000, retryCount: 2 }),
  batch: { multicall: true },
});

export const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http(undefined, { timeout: 10_000, retryCount: 2 }),
  batch: { multicall: true },
});
