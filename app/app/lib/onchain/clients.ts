import { createPublicClient, http } from "viem";
import { arcTestnet, unichainSepolia } from "./chains";
import { unichainTransport } from "./transport";

/**
 * One read-only client per chain, created at module scope so a request does
 * not pay for a new transport. Read-only on purpose: nothing in the app
 * writes yet (PHASES.md phase 4 adds wallet connect and the write paths), so
 * there is no wallet client and no connector dependency here.
 *
 * `batch: true` collapses the several reads a panel needs into one
 * eth_call multicall round trip where the RPC supports it.
 */

export const unichainClient = createPublicClient({
  chain: unichainSepolia,
  transport: unichainTransport(),
  batch: { multicall: true },
});

export const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http(undefined, { timeout: 10_000, retryCount: 2 }),
  batch: { multicall: true },
});
