"use client";

import { erc20Abi, parseAbiItem, type Address } from "viem";
import { readContract } from "wagmi/actions";
import { sigmaVaultAbi } from "./abis";
import { MEASURED_POOL_ID, SIGMA_VAULT, USDC_DECIMALS } from "./addresses";
import { unichainClient } from "./clients";
import { UNICHAIN } from "./writes";
import { wagmiConfig } from "./wagmi";

/**
 * A wallet's STORM/CALM holdings, per epoch — not just the current one.
 *
 * `PositionsProvider` used to read only the *active* epoch's leg tokens, so
 * the instant an epoch rolled, its fresh `longToken`/`shortToken` addresses
 * left every earlier epoch's tokens unread. The position wasn't gone — the
 * wallet still held it, and if that epoch had settled, it was sitting there
 * redeemable — the dashboard just stopped looking. This scans a bounded
 * window of recent epochs on the measured pool and reports every one still
 * held, settled or not, so a position never silently disappears.
 *
 * Bounded, not exhaustive, for the same reason `positions.ts`'s
 * `readOwnedPositions` is bounded: `epochCount()` only grows, and walking
 * every epoch since the first forever gets slower for no benefit once epochs
 * this old are vanishingly unlikely to still be held and unredeemed.
 *
 * A redeemed leg's balance is zero by definition (`redeem` burns it), so a
 * row surviving purely on "current balance > 0" disappears the instant it's
 * closed out — exactly the position `redeem` just paid out looks like it was
 * never there. `VolatusVault`'s own `Redeemed` event is what keeps it
 * visible: a fixed, un-cloned contract, so unlike the per-epoch leg tokens
 * this needs exactly one bounded scan for the whole lookback window, not one
 * per epoch.
 *
 * `eth_getLogs` can't be multicall-batched the way plain reads can — every
 * epoch in this window costs one real HTTP round trip, not a fraction of a
 * shared one. At epochs this short (~10 minutes), 5 covers roughly the last
 * hour, which is the entire realistic demo window; 30 was six times the
 * request volume for coverage nothing in this project's lifetime has needed.
 */
const EPOCH_LOOKBACK = 5n;
const LOG_CHUNK = 9_500n;
const MAX_CHUNKS = 50;

const REDEEMED_EVENT = parseAbiItem(
  "event Redeemed(uint256 indexed epochId, address indexed holder, bool isLong, uint256 amount, uint256 payout)",
);

export type EpochPosition = {
  epochId: bigint;
  /** Whether this is the pool's current epoch (open or awaiting settlement). */
  isCurrent: boolean;
  settled: boolean;
  /** WAD in [0, 1e18], only meaningful once `settled`. */
  payoffWad: bigint;
  longToken: Address;
  shortToken: Address;
  /** 6dp USDC-scaled token balances, as plain numbers. Zero once redeemed. */
  longSize: number;
  shortSize: number;
  /** USDC actually paid out by a past `redeem` on this leg, if any — the
   *  record that keeps a closed position visible after its balance hits 0. */
  longRedeemedUsdc: number | null;
  shortRedeemedUsdc: number | null;
};

const vault = { address: SIGMA_VAULT, abi: sigmaVaultAbi } as const;

/** Every `Redeemed` event this wallet has ever triggered, from `floorBlock`
 *  onward — one scan for every epoch in the lookback window, not one each. */
async function readRedemptions(owner: Address, floorBlock: bigint) {
  const latest = await unichainClient.getBlockNumber();
  const all: Awaited<ReturnType<typeof unichainClient.getLogs<typeof REDEEMED_EVENT>>> = [];

  let from = floorBlock;
  for (let i = 0; i < MAX_CHUNKS && from <= latest; i++) {
    const to = from + LOG_CHUNK - 1n < latest ? from + LOG_CHUNK - 1n : latest;
    const logs = await unichainClient.getLogs({
      address: SIGMA_VAULT,
      event: REDEEMED_EVENT,
      args: { holder: owner },
      fromBlock: from,
      toBlock: to,
    });
    all.push(...logs);
    from = to + 1n;
  }

  // Keyed by "<epochId>-<isLong>" -- redeem is one-shot per leg per epoch, so
  // at most one entry per key, but a Map assignment is cheap enough not to
  // bother asserting that.
  const byKey = new Map<string, bigint>();
  for (const log of all) {
    const epochId = log.args.epochId!;
    const isLong = log.args.isLong!;
    byKey.set(`${epochId}-${isLong}`, log.args.payout!);
  }
  return byKey;
}

/**
 * Every epoch on the measured pool, within the lookback window, where `owner`
 * either still holds a nonzero STORM or CALM balance, or has redeemed one in
 * the past — a closed position stays visible with what it paid out, rather
 * than disappearing the moment its balance reaches zero.
 */
export async function readEpochPositions(owner: Address): Promise<EpochPosition[]> {
  const [epochCount, activeEpochId] = await Promise.all([
    readContract(wagmiConfig, { ...vault, functionName: "epochCount", chainId: UNICHAIN }),
    readContract(wagmiConfig, { ...vault, functionName: "activeEpoch", args: [MEASURED_POOL_ID], chainId: UNICHAIN }),
  ]);
  if (epochCount === 0n) return [];

  const floor = epochCount > EPOCH_LOOKBACK ? epochCount - EPOCH_LOOKBACK + 1n : 1n;
  const ids: bigint[] = [];
  for (let id = epochCount; id >= floor; id--) ids.push(id);

  const epochs = await Promise.all(
    ids.map((id) => readContract(wagmiConfig, { ...vault, functionName: "epoch", args: [id], chainId: UNICHAIN })),
  );

  const onThisPool = ids
    .map((id, i) => ({ id, e: epochs[i] }))
    .filter(({ e }) => e.poolId.toLowerCase() === MEASURED_POOL_ID.toLowerCase());
  if (onThisPool.length === 0) return [];

  const oldestStartBlock = BigInt(Math.min(...onThisPool.map(({ e }) => e.startBlock)));

  const [balances, redemptions] = await Promise.all([
    Promise.all(
      onThisPool.map(({ e }) =>
        Promise.all([
          readContract(wagmiConfig, {
            address: e.longToken,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [owner],
            chainId: UNICHAIN,
          }),
          readContract(wagmiConfig, {
            address: e.shortToken,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [owner],
            chainId: UNICHAIN,
          }),
        ]),
      ),
    ),
    readRedemptions(owner, oldestStartBlock),
  ]);

  return onThisPool
    .map(({ id, e }, i) => {
      const [longBalance, shortBalance] = balances[i];
      const longRedeemed = redemptions.get(`${id}-true`);
      const shortRedeemed = redemptions.get(`${id}-false`);
      return {
        epochId: id,
        isCurrent: id === activeEpochId,
        settled: e.settled,
        payoffWad: e.payoffWad,
        longToken: e.longToken,
        shortToken: e.shortToken,
        longSize: Number(longBalance) / 10 ** USDC_DECIMALS,
        shortSize: Number(shortBalance) / 10 ** USDC_DECIMALS,
        longRedeemedUsdc: longRedeemed === undefined ? null : Number(longRedeemed) / 10 ** USDC_DECIMALS,
        shortRedeemedUsdc: shortRedeemed === undefined ? null : Number(shortRedeemed) / 10 ** USDC_DECIMALS,
      };
    })
    .filter((p) => p.longSize > 0 || p.shortSize > 0 || p.longRedeemedUsdc !== null || p.shortRedeemedUsdc !== null)
    .sort((a, b) => Number(b.epochId - a.epochId));
}
