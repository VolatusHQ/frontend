/**
 * Typed reads against the deployed contracts.
 *
 * Every function returns a discriminated result rather than throwing. A
 * reverting read turns an empty state into a blank page, and an RPC hiccup
 * must not take a route down — so the caller always gets something renderable
 * and the UI draws an honest "no feed" instead of a fabricated number
 * (INTEGRATION.md § Honest empty states).
 *
 * Two rules enforced here so no component has to remember them:
 *   - `tryImpliedVol`, never `impliedVol`. The latter reverts when a pool has
 *     no active epoch or no registered vol pool.
 *   - Volatility and variance are WAD (1e18). Everything on Arc, and all
 *     collateral, is 6 decimals. They are never added together.
 */

import {
  sigmaHookAbi,
  sigmaOracleAbi,
  sigmaOracleVolPoolAbi,
  sigmaStreamAbi,
  sigmaVaultAbi,
  stateViewAbi,
} from "./abis";
import {
  MEASURED_POOL_ID,
  SIGMA_HOOK,
  SIGMA_ORACLE,
  SIGMA_STREAM,
  SIGMA_VAULT,
  STATE_VIEW,
} from "./addresses";
import { arcClient, unichainClient } from "./clients";

export type Failed = { ok: false; reason: string };

/**
 * A read that is allowed to revert.
 *
 * Several oracle and vault views revert by design when there is no epoch —
 * `realizedVol` reaches through to `realizedVariance(activeEpoch)`, which
 * reverts `NoSuchEpoch(0)`. That is a *state*, not an outage, so each such
 * field degrades to null on its own instead of failing the whole panel.
 */
async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Unichain Sepolia — the index                                        */
/* ------------------------------------------------------------------ */

export type VarianceState = {
  accumulator: bigint;
  lastTick: number;
  lastBlock: bigint;
  observations: number;
  pendingSnapshot: bigint;
};

export type LiveIndex = {
  ok: true;
  /** Annualized implied volatility, WAD. Absent when the market has no feed. */
  impliedVolWad: bigint | null;
  /** Annualized realized volatility so far this epoch, WAD. */
  realizedVolWad: bigint;
  /** Realized variance so far this epoch, WAD, over the epoch horizon. */
  realizedVarianceWad: bigint;
  /** Market price of VAR-LONG, WAD in [0, 1e18]. A price, not a percentage. */
  normalizedImpliedVarianceWad: bigint | null;
  endBlock: bigint;
  strikeWad: bigint;
  capWad: bigint;
  state: VarianceState;
  /** 0 when no epoch is open on this pool. */
  activeEpochId: bigint;
  blockNumber: bigint;
  /** The chain head is past `endBlock` — the epoch is over. */
  epochEnded: boolean;
  /**
   * `settle()` has not run yet, so the oracle still returns the last traded
   * price. Deliberate, not a bug — INTEGRATION.md § Failure modes, row 5.
   */
  awaitingSettlement: boolean;
};

export async function readIndex(): Promise<LiveIndex | Failed> {
  try {
    const oracle = { address: SIGMA_ORACLE, abi: sigmaOracleAbi } as const;

    const [tryIv, realizedVol, realizedVariance, epoch, state, activeEpochId, blockNumber] =
      await Promise.all([
        unichainClient.readContract({
          ...oracle,
          functionName: "tryImpliedVol",
          args: [MEASURED_POOL_ID],
        }),
        unichainClient.readContract({
          ...oracle,
          functionName: "realizedVol",
          args: [MEASURED_POOL_ID],
        }),
        unichainClient.readContract({
          ...oracle,
          functionName: "realizedVariance",
          args: [MEASURED_POOL_ID],
        }),
        unichainClient.readContract({
          ...oracle,
          functionName: "epoch",
          args: [MEASURED_POOL_ID],
        }),
        unichainClient.readContract({
          address: SIGMA_HOOK,
          abi: sigmaHookAbi,
          functionName: "varianceState",
          args: [MEASURED_POOL_ID],
        }),
        unichainClient.readContract({
          address: SIGMA_VAULT,
          abi: sigmaVaultAbi,
          functionName: "activeEpoch",
          args: [MEASURED_POOL_ID],
        }),
        unichainClient.getBlockNumber(),
      ]);

    const [ivOk, impliedVolWad] = tryIv;
    const [endBlock, strikeWad, capWad] = epoch;

    // Only meaningful when there is a feed; a price with no market is a
    // pool's initialization value, not a quote.
    let normalized: bigint | null = null;
    if (ivOk) {
      try {
        normalized = await unichainClient.readContract({
          ...oracle,
          functionName: "normalizedImpliedVariance",
          args: [MEASURED_POOL_ID],
        });
      } catch {
        normalized = null;
      }
    }

    const epochEnded = blockNumber > endBlock;

    return {
      ok: true,
      impliedVolWad: ivOk ? impliedVolWad : null,
      realizedVolWad: realizedVol,
      realizedVarianceWad: realizedVariance,
      normalizedImpliedVarianceWad: normalized,
      endBlock,
      strikeWad,
      capWad,
      state: {
        accumulator: state.accumulator,
        lastTick: state.lastTick,
        lastBlock: BigInt(state.lastBlock),
        observations: state.observations,
        pendingSnapshot: BigInt(state.pendingSnapshot),
      },
      activeEpochId,
      blockNumber,
      epochEnded,
      awaitingSettlement: epochEnded && activeEpochId !== 0n,
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown RPC error" };
  }
}

/* ------------------------------------------------------------------ */
/* The market — one pool, one epoch, read whole                        */
/* ------------------------------------------------------------------ */

/**
 * Which of the three states the protocol is actually in. All three are normal
 * and the UI must be able to draw each without inventing anything:
 *
 *  - `live`                 an epoch is open; legs can be minted and traded.
 *  - `awaiting-settlement`  the epoch's endBlock has passed and nobody has
 *                           called `settle` yet. `mintPair` reverts and the
 *                           oracle still returns the last traded price.
 *  - `none`                 no epoch is open. Nothing to price, nothing to buy.
 */
export type MarketStatus = "live" | "awaiting-settlement" | "none";

export type MarketEpoch = {
  id: bigint;
  startBlock: bigint;
  endBlock: bigint;
  horizonSeconds: number;
  settled: boolean;
  strikeWad: bigint;
  capWad: bigint;
  longToken: `0x${string}`;
  shortToken: `0x${string}`;
  collateralHeld: bigint;
  payoffWad: bigint;
};

export type PoolState = {
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
};

export type LiveMarket = {
  ok: true;
  blockNumber: bigint;
  status: MarketStatus;
  /** The active epoch, or the most recent one when none is open. Null before any exists. */
  epoch: MarketEpoch | null;
  /** Blocks left in the epoch. Zero once it has ended. Unichain is ~1s/block. */
  blocksRemaining: bigint;
  /** WAD. Null when no vol pool answers — an absent price, never a guessed one. */
  impliedVolWad: bigint | null;
  realizedVolWad: bigint | null;
  realizedVarianceWad: bigint | null;
  /** VAR-LONG's market price, WAD in [0,1]. A price, not a percentage. */
  varLongPriceWad: bigint | null;
  state: VarianceState;
  measured: PoolState;
  /** The pool where implied vol is discovered, once one is registered. */
  volPool: (PoolState & { poolId: `0x${string}`; longIsCurrency0: boolean }) | null;
};

export async function readMarket(): Promise<LiveMarket | Failed> {
  try {
    const oracle = { address: SIGMA_ORACLE, abi: sigmaOracleAbi } as const;
    const vault = { address: SIGMA_VAULT, abi: sigmaVaultAbi } as const;
    const view = { address: STATE_VIEW, abi: stateViewAbi } as const;

    const [blockNumber, activeEpochId, epochCount, hookState, measuredSlot0, measuredLiquidity] =
      await Promise.all([
        unichainClient.getBlockNumber(),
        unichainClient.readContract({ ...vault, functionName: "activeEpoch", args: [MEASURED_POOL_ID] }),
        unichainClient.readContract({ ...vault, functionName: "epochCount" }),
        unichainClient.readContract({
          address: SIGMA_HOOK,
          abi: sigmaHookAbi,
          functionName: "varianceState",
          args: [MEASURED_POOL_ID],
        }),
        unichainClient.readContract({ ...view, functionName: "getSlot0", args: [MEASURED_POOL_ID] }),
        unichainClient.readContract({ ...view, functionName: "getLiquidity", args: [MEASURED_POOL_ID] }),
      ]);

    // When nothing is open, the most recent epoch is still the honest subject —
    // it is what settled, and what the legs in someone's wallet belong to.
    const epochId = activeEpochId !== 0n ? activeEpochId : epochCount;

    const raw = epochId === 0n ? null : await safe(
      unichainClient.readContract({ ...vault, functionName: "epoch", args: [epochId] }),
    );

    const epoch: MarketEpoch | null = raw
      ? {
          id: epochId,
          startBlock: BigInt(raw.startBlock),
          endBlock: BigInt(raw.endBlock),
          horizonSeconds: raw.horizonSeconds,
          settled: raw.settled,
          strikeWad: raw.strikeWad,
          capWad: raw.capWad,
          longToken: raw.longToken,
          shortToken: raw.shortToken,
          collateralHeld: raw.collateralHeld,
          payoffWad: raw.payoffWad,
        }
      : null;

    const ended = epoch !== null && blockNumber > epoch.endBlock;
    const status: MarketStatus =
      activeEpochId === 0n ? "none" : ended ? "awaiting-settlement" : "live";

    const [tryIv, realizedVol, realizedVariance, vp] = await Promise.all([
      safe(unichainClient.readContract({ ...oracle, functionName: "tryImpliedVol", args: [MEASURED_POOL_ID] })),
      safe(unichainClient.readContract({ ...oracle, functionName: "realizedVol", args: [MEASURED_POOL_ID] })),
      safe(unichainClient.readContract({ ...oracle, functionName: "realizedVariance", args: [MEASURED_POOL_ID] })),
      epochId === 0n
        ? Promise.resolve(null)
        : safe(
            unichainClient.readContract({
              address: SIGMA_ORACLE,
              abi: sigmaOracleVolPoolAbi,
              functionName: "volPool",
              args: [epochId],
            }),
          ),
    ]);

    let volPool: LiveMarket["volPool"] = null;
    if (vp?.registered) {
      const [slot0, liquidity] = await Promise.all([
        safe(unichainClient.readContract({ ...view, functionName: "getSlot0", args: [vp.poolId] })),
        safe(unichainClient.readContract({ ...view, functionName: "getLiquidity", args: [vp.poolId] })),
      ]);
      if (slot0) {
        volPool = {
          poolId: vp.poolId,
          longIsCurrency0: vp.longIsCurrency0,
          sqrtPriceX96: slot0[0],
          tick: slot0[1],
          liquidity: liquidity ?? 0n,
        };
      }
    }

    const varLongPrice = volPool
      ? await safe(
          unichainClient.readContract({
            ...oracle,
            functionName: "normalizedImpliedVariance",
            args: [MEASURED_POOL_ID],
          }),
        )
      : null;

    return {
      ok: true,
      blockNumber,
      status,
      epoch,
      blocksRemaining: epoch && epoch.endBlock > blockNumber ? epoch.endBlock - blockNumber : 0n,
      impliedVolWad: tryIv && tryIv[0] ? tryIv[1] : null,
      realizedVolWad: realizedVol,
      realizedVarianceWad: realizedVariance,
      varLongPriceWad: varLongPrice,
      state: {
        accumulator: hookState.accumulator,
        lastTick: hookState.lastTick,
        lastBlock: BigInt(hookState.lastBlock),
        observations: hookState.observations,
        pendingSnapshot: BigInt(hookState.pendingSnapshot),
      },
      measured: {
        sqrtPriceX96: measuredSlot0[0],
        tick: measuredSlot0[1],
        liquidity: measuredLiquidity,
      },
      volPool,
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown RPC error" };
  }
}

/* ------------------------------------------------------------------ */
/* Arc Testnet — the premium stream                                    */
/* ------------------------------------------------------------------ */

export type StreamEpoch = {
  coverageStart: bigint;
  coverageEnd: bigint;
  reportDeadline: bigint;
  reported: boolean;
  payoffWad: bigint;
  totalCoverageSold: bigint;
};

export type LiveStream = {
  ok: true;
  /** Underwriter capital plus premium earned, minus claims paid. 6dp USDC. */
  capacityPoolUsdc: bigint;
  totalShares: bigint;
  settlementReporter: `0x${string}`;
  /** The mirrored epoch on Arc, or null when this id was never opened here. */
  epoch: StreamEpoch | null;
  epochId: bigint;
  blockNumber: bigint;
  /** Chain time, for runway and accrual maths. */
  timestamp: bigint;
  /**
   * The report window closed with no payoff published. The fail-safe is live:
   * subscribers can `reclaimUnreported` and underwriters withdraw capacity.
   */
  refundable: boolean;
};

export async function readStream(epochId: bigint = 1n): Promise<LiveStream | Failed> {
  try {
    const stream = { address: SIGMA_STREAM, abi: sigmaStreamAbi } as const;

    const [capacityPool, totalShares, reporter, epoch, block] = await Promise.all([
      arcClient.readContract({ ...stream, functionName: "capacityPool" }),
      arcClient.readContract({ ...stream, functionName: "totalShares" }),
      arcClient.readContract({ ...stream, functionName: "settlementReporter" }),
      arcClient.readContract({ ...stream, functionName: "epoch", args: [epochId] }),
      arcClient.getBlock(),
    ]);

    // coverageEnd == 0 means openEpoch was never called for this id on Arc.
    const opened = epoch.coverageEnd !== 0n;

    return {
      ok: true,
      capacityPoolUsdc: capacityPool,
      totalShares,
      settlementReporter: reporter,
      epoch: opened
        ? {
            coverageStart: epoch.coverageStart,
            coverageEnd: epoch.coverageEnd,
            reportDeadline: epoch.reportDeadline,
            reported: epoch.reported,
            payoffWad: epoch.payoffWad,
            totalCoverageSold: epoch.totalCoverageSold,
          }
        : null,
      epochId,
      blockNumber: block.number,
      timestamp: block.timestamp,
      refundable: opened && !epoch.reported && block.timestamp > epoch.reportDeadline,
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown RPC error" };
  }
}

export type LiveSubscription = {
  ok: true;
  ratePerSecond: bigint;
  coverageNotional: bigint;
  funded: bigint;
  lastSync: bigint;
  coveredSeconds: bigint;
  claimed: boolean;
  runwaySeconds: bigint;
  /** No subscription exists for this (epoch, address). */
  empty: boolean;
};

export async function readSubscription(
  epochId: bigint,
  subscriber: `0x${string}`,
): Promise<LiveSubscription | Failed> {
  try {
    const stream = { address: SIGMA_STREAM, abi: sigmaStreamAbi } as const;
    const [sub, runway] = await Promise.all([
      arcClient.readContract({ ...stream, functionName: "subscription", args: [epochId, subscriber] }),
      arcClient.readContract({ ...stream, functionName: "runwaySeconds", args: [epochId, subscriber] }),
    ]);

    return {
      ok: true,
      ratePerSecond: sub.ratePerSecond,
      coverageNotional: sub.coverageNotional,
      funded: sub.funded,
      lastSync: sub.lastSync,
      coveredSeconds: sub.coveredSeconds,
      claimed: sub.claimed,
      runwaySeconds: runway,
      empty: sub.ratePerSecond === 0n,
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown RPC error" };
  }
}
