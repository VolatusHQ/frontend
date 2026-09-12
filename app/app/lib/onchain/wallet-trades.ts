"use client";

import { parseAbiItem, parseEventLogs, zeroAddress, type Address, type Hex } from "viem";
import { readContract } from "wagmi/actions";
import { REAL_POOL } from "../live-market";
import type { Trade } from "../positions-context";
import { sigmaOracleVolPoolAbi, sigmaVaultAbi } from "./abis";
import { MEASURED_POOL_ID, POOL_MANAGER, SIGMA_ORACLE, SIGMA_VAULT, USDC_DECIMALS } from "./addresses";
import { unichainClient } from "./clients";
import { varLongPrice } from "./v4";
import { UNICHAIN } from "./writes";
import { wagmiConfig } from "./wagmi";

/**
 * A wallet's own real trades, reconstructed entirely from chain — no backend,
 * no database. `PositionsProvider.buy()` used to return `trades: []` always,
 * so the Profile activity feed / trade history and the market page's History
 * tab had nothing of the connected wallet's own to show; this fills it in
 * from the same STORM/CALM `Transfer` events `epoch-positions.ts` already
 * reads for balances, joined against the vol pool's `Swap` event in the same
 * transaction to recover the price it executed at.
 *
 * A router-mediated swap's `Transfer` on the leg token still names the real
 * end wallet as `from`/`to` (the test router settles directly against the
 * caller), which is what makes per-wallet attribution possible at all — the
 * `Swap` event's own `sender` is the router, not the trader, and cannot be
 * used for this on its own.
 *
 * Two trade shapes come out of this, matching how `positions-context.tsx`'s
 * `buy()` actually trades:
 *   - `long`  — a plain swap into the vol pool. One `Transfer(to = owner)`
 *     with a same-tx `Swap` log is the whole trade.
 *   - `short` — mint a pair, then sell the long leg. The mint alone isn't a
 *     directional trade (both legs land 1:1), so only the sell leg is
 *     surfaced: a `Transfer(from = owner)` of the long token with a same-tx
 *     `Swap` log. Its price is `1 - longPrice`, and its size is exactly the
 *     short position that sale leaves behind.
 */

const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const SWAP_EVENT = parseAbiItem(
  "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)",
);

// `eth_getLogs` can't be multicall-batched — every epoch here costs two real
// HTTP round trips (buy scan + sell scan), not a fraction of a shared one.
// 5 epochs covers roughly the last hour at this protocol's ~10-minute
// epochs, the entire realistic demo window; 30 was six times the request
// volume, which is what actually overwhelmed the RPC.
const EPOCH_LOOKBACK = 5n;
const LOG_CHUNK = 9_500n;
const MAX_CHUNKS = 50; // a defensive cap, not the expected path — see scanTransfers
const MAX_TRADES = 50;

const vault = { address: SIGMA_VAULT, abi: sigmaVaultAbi } as const;

async function listRecentEpochsOnMeasuredPool() {
  const epochCount = await readContract(wagmiConfig, { ...vault, functionName: "epochCount", chainId: UNICHAIN });
  if (epochCount === 0n) return [];

  const floor = epochCount > EPOCH_LOOKBACK ? epochCount - EPOCH_LOOKBACK + 1n : 1n;
  const ids: bigint[] = [];
  for (let id = epochCount; id >= floor; id--) ids.push(id);

  const epochs = await Promise.all(
    ids.map((id) => readContract(wagmiConfig, { ...vault, functionName: "epoch", args: [id], chainId: UNICHAIN })),
  );

  return ids
    .map((id, i) => ({ id, e: epochs[i] }))
    .filter(({ e }) => e.poolId.toLowerCase() === MEASURED_POOL_ID.toLowerCase());
}

/**
 * Chunked scan bounded to the RPC's 10,000-block `eth_getLogs` cap — but
 * starting from `epochStartBlock`, not walking backward from `latest`
 * regardless of it. Each epoch's leg tokens are a fresh clone minted at that
 * epoch's own start block, so no transfer on one can predate it; scanning
 * further back than that wastes calls on a chain that is already tens of
 * millions of blocks tall and, at `MAX_CHUNKS` epochs deep in the lookback,
 * previously meant hundreds of sequential RPC calls per wallet load — slow
 * enough to time out or get rate-limited into a false "no trades" empty
 * result before it ever finished.
 */
async function scanTransfers(token: Address, owner: Address, direction: "to" | "from", epochStartBlock: bigint) {
  const latest = await unichainClient.getBlockNumber();
  const all: Awaited<ReturnType<typeof unichainClient.getLogs<typeof TRANSFER_EVENT>>> = [];

  let from = epochStartBlock;
  for (let i = 0; i < MAX_CHUNKS && from <= latest; i++) {
    const to = from + LOG_CHUNK - 1n < latest ? from + LOG_CHUNK - 1n : latest;
    const logs = await unichainClient.getLogs({
      address: token,
      event: TRANSFER_EVENT,
      args: direction === "to" ? { to: owner } : { from: owner },
      fromBlock: from,
      toBlock: to,
    });
    all.push(...logs);
    from = to + 1n;
  }
  return all;
}

/** The vol pool's price, from the same transaction's own `Swap` log — or
 *  `null` when this transfer wasn't part of a swap at all (a plain mint). */
async function swapPriceInTx(txHash: Hex, volPoolId: Hex, longIsCurrency0: boolean): Promise<number | null> {
  const receipt = await unichainClient.getTransactionReceipt({ hash: txHash });
  const decoded = parseEventLogs({
    abi: [SWAP_EVENT],
    logs: receipt.logs.filter((l) => l.address.toLowerCase() === POOL_MANAGER.toLowerCase()),
  });
  const swap = decoded.find((l) => l.args.id.toLowerCase() === volPoolId.toLowerCase());
  if (!swap) return null;
  const price = varLongPrice(swap.args.sqrtPriceX96, longIsCurrency0);
  return Number.isFinite(price) && price > 0 && price < 1e9 ? price : null;
}

async function readEpochTrades(owner: Address, epochId: bigint, e: { longToken: Address; startBlock: number }): Promise<Trade[]> {
  const vp = await readContract(wagmiConfig, {
    address: SIGMA_ORACLE,
    abi: sigmaOracleVolPoolAbi,
    functionName: "volPool",
    args: [epochId],
    chainId: UNICHAIN,
  });
  if (!vp.registered) return []; // no vol pool this epoch -- nothing traded, nothing to find

  const startBlock = BigInt(e.startBlock);
  const [bought, sold] = await Promise.all([
    scanTransfers(e.longToken, owner, "to", startBlock),
    scanTransfers(e.longToken, owner, "from", startBlock),
  ]);

  const trades: Trade[] = [];

  for (const log of bought) {
    if ((log.args.from ?? zeroAddress) === zeroAddress) continue; // a mint, not a buy
    const price = await swapPriceInTx(log.transactionHash, vp.poolId, vp.longIsCurrency0);
    if (price === null) continue;
    const tokens = Number(log.args.value ?? 0n) / 10 ** USDC_DECIMALS;
    trades.push({
      id: `${log.transactionHash}-${log.logIndex}`,
      slug: REAL_POOL.slug,
      side: "long",
      tokens,
      price,
      usdcAmount: tokens * price,
      timestamp: 0, // filled in below, once, for every unique tx this function found
    });
  }

  for (const log of sold) {
    if ((log.args.to ?? zeroAddress) === zeroAddress) continue; // a burn, not a sale
    const longPrice = await swapPriceInTx(log.transactionHash, vp.poolId, vp.longIsCurrency0);
    if (longPrice === null) continue;
    const shortPrice = 1 - longPrice;
    const tokens = Number(log.args.value ?? 0n) / 10 ** USDC_DECIMALS;
    trades.push({
      id: `${log.transactionHash}-${log.logIndex}`,
      slug: REAL_POOL.slug,
      side: "short",
      tokens,
      price: shortPrice,
      usdcAmount: tokens * shortPrice,
      timestamp: 0,
    });
  }

  return trades;
}

export async function readWalletTrades(owner: Address): Promise<Trade[]> {
  const epochs = await listRecentEpochsOnMeasuredPool();
  if (epochs.length === 0) return [];

  // Each epoch's own scan is now bounded to its own (small) block range, so
  // running them concurrently is cheap rather than the flood of overlapping
  // wide scans a naive Promise.all would have been before that bound existed.
  const perEpoch = await Promise.all(epochs.map(({ id, e }) => readEpochTrades(owner, id, e)));
  const trades: Trade[] = perEpoch.flat();

  if (trades.length === 0) return [];

  // One block-timestamp lookup per unique tx, not per trade.
  const hashes = [...new Set(trades.map((t) => t.id.split("-")[0] as Hex))];
  const timesByHash = new Map<Hex, number>();
  await Promise.all(
    hashes.map(async (hash) => {
      const receipt = await unichainClient.getTransactionReceipt({ hash });
      const block = await unichainClient.getBlock({ blockNumber: receipt.blockNumber });
      timesByHash.set(hash, Number(block.timestamp));
    }),
  );

  return trades
    .map((t) => ({ ...t, timestamp: timesByHash.get(t.id.split("-")[0] as Hex) ?? 0 }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_TRADES);
}
