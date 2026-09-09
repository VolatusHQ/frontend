"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { writeContract } from "wagmi/actions";
import type { PoolSlug } from "./market-data";
import { REAL_POOL } from "./live-market";
import type { LpPosition } from "./liquidity-data";
import { sigmaStreamAbi } from "./onchain/abis";
import {
  ARC_USDC,
  LIVE_EPOCH_ID,
  MEASURED_POOL_KEY,
  POSITION_MANAGER,
  SIGMA_STREAM,
  USDC_DECIMALS,
} from "./onchain/addresses";
import { arcTestnet } from "./onchain/chains";
import { positionManagerAbi } from "./onchain/abis";
import { encodeMint, readOwnedPositions } from "./onchain/positions";
import { amountsForLiquidity, sqrtPriceAtTick } from "./onchain/v4";
import { ensureAllowance, ensurePermit2, ARC, UNICHAIN, waitFor } from "./onchain/writes";
import { wagmiConfig } from "./onchain/wagmi";

/**
 * The wallet's Uniswap liquidity, and whether it is protected.
 *
 * Both halves are the chain's now. Positions are real v4 ERC-721s found by
 * scanning the PositionManager's transfers; protection is a real subscription
 * on `SigmaStream`, where the premium rate and coverage notional are what the
 * contract actually holds.
 *
 * `feesEarnedUsd` is reported as zero and its column dropped: v4 fee growth is
 * recoverable in principle but this pool pairs two mock tokens at a raw 1:1,
 * so a dollar figure for it would be invented.
 */

/** The range the measured pool was seeded with; deposits use the same one. */
const TICK_LOWER = -6000;
const TICK_UPPER = 6000;

export type ProtectionState = {
  protectedUsd: number;
  startedAt: number;
  premiumPerSec: number;
};

type Ctx = {
  positions: Partial<Record<PoolSlug, LpPosition>>;
  protection: Partial<Record<PoolSlug, ProtectionState>>;
  start: (slug: PoolSlug, protectedUsd: number) => Promise<void>;
  adjust: (slug: PoolSlug, protectedUsd: number) => Promise<void>;
  stop: (slug: PoolSlug) => Promise<void>;
  addLiquidity: (slug: PoolSlug, usdcAmount: number) => Promise<void>;
  ready: boolean;
};

const LiquidityContext = createContext<Ctx | null>(null);

export function useLiquidity(): Ctx {
  const ctx = useContext(LiquidityContext);
  if (!ctx) throw new Error("useLiquidity must be used inside LiquidityProvider");
  return ctx;
}

export function LiquidityProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();

  const { data: owned, refetch: refetchOwned } = useQuery({
    queryKey: ["lp-positions", address],
    queryFn: () => readOwnedPositions(address!),
    enabled: Boolean(address),
  });

  const subscription = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "subscription",
    args: address ? [LIVE_EPOCH_ID, address] : undefined,
    chainId: ARC,
    query: { enabled: Boolean(address) },
  });

  const positions: Partial<Record<PoolSlug, LpPosition>> = useMemo(() => {
    if (!owned || owned.length === 0) return {};
    // Every position is in the measured pool — `readOwnedPositions` filters to
    // it — so they aggregate into the single row this pool has.
    const sqrtLower = sqrtPriceAtTick(TICK_LOWER);
    const sqrtUpper = sqrtPriceAtTick(TICK_UPPER);
    const totalUsdc = owned.reduce((sum, p) => {
      const { amount0 } = amountsForLiquidity(
        sqrtPriceAtTick((p.tickLower + p.tickUpper) / 2),
        sqrtLower,
        sqrtUpper,
        p.liquidity,
      );
      return sum + Number(amount0) / 10 ** USDC_DECIMALS;
    }, 0);

    return {
      [REAL_POOL.slug]: {
        slug: REAL_POOL.slug,
        // The mUSDC side of the position. The other side is an 18dp mock with
        // no price, so there is no honest total to add it to.
        valueUsd: totalUsdc,
        feesEarnedUsd: 0,
        isOwner: true,
      },
    };
  }, [owned]);

  const protection: Partial<Record<PoolSlug, ProtectionState>> = useMemo(() => {
    const sub = subscription.data;
    if (!sub || sub.ratePerSecond === 0n) return {};
    return {
      [REAL_POOL.slug]: {
        protectedUsd: Number(sub.coverageNotional) / 10 ** USDC_DECIMALS,
        startedAt: Number(sub.lastSync),
        premiumPerSec: Number(sub.ratePerSecond) / 10 ** USDC_DECIMALS,
      },
    };
  }, [subscription.data]);

  /** Open a stream: subscribe at a rate, then fund a day of runway. */
  const start = useCallback(
    async (_slug: PoolSlug, protectedUsd: number) => {
      if (!address || protectedUsd <= 0) return;
      const notional = parseUnits(protectedUsd.toFixed(USDC_DECIMALS), USDC_DECIMALS);
      // A rate the contract can hold: one hundred-thousandth of the notional
      // per second, which is what the seeded demo subscription used.
      const rate = notional / 100_000n > 0n ? notional / 100_000n : 1n;

      const sub = await writeContract(wagmiConfig, {
        address: SIGMA_STREAM,
        abi: sigmaStreamAbi,
        functionName: "subscribe",
        args: [LIVE_EPOCH_ID, rate, notional],
        chainId: ARC,
      });
      await waitFor(sub, ARC);

      const funding = rate * 86_400n;
      await ensureAllowance({
        token: ARC_USDC,
        owner: address,
        spender: SIGMA_STREAM,
        amount: funding,
        chainId: ARC,
      });
      const fund = await writeContract(wagmiConfig, {
        address: SIGMA_STREAM,
        abi: sigmaStreamAbi,
        functionName: "fund",
        args: [LIVE_EPOCH_ID, funding],
        chainId: ARC,
      });
      await waitFor(fund, ARC);
      subscription.refetch();
    },
    [address, subscription],
  );

  /**
   * `SigmaStream.adjust` is deployed on the live contract (2026-09-05
   * redeploy) but this button still only tops up the runway rather than
   * calling it. Re-rating a subscription is the hedger's job, driven off a
   * live IV move (BACKEND_HANDOFF.md § Service 3), not a manual control an
   * LP clicks — wiring it here needs a product decision this pass did not
   * make, not a missing contract function.
   */
  const adjust = useCallback(
    async (_slug: PoolSlug, protectedUsd: number) => {
      if (!address || protectedUsd <= 0) return;
      const amount = parseUnits(protectedUsd.toFixed(USDC_DECIMALS), USDC_DECIMALS);
      await ensureAllowance({
        token: ARC_USDC,
        owner: address,
        spender: SIGMA_STREAM,
        amount,
        chainId: ARC,
      });
      const hash = await writeContract(wagmiConfig, {
        address: SIGMA_STREAM,
        abi: sigmaStreamAbi,
        functionName: "fund",
        args: [LIVE_EPOCH_ID, amount],
        chainId: ARC,
      });
      await waitFor(hash, ARC);
      subscription.refetch();
    },
    [address, subscription],
  );

  /** Cancel the stream. Coverage stops here and unspent premium comes back. */
  const stop = useCallback(async () => {
    if (!address) return;
    const hash = await writeContract(wagmiConfig, {
      address: SIGMA_STREAM,
      abi: sigmaStreamAbi,
      functionName: "cancel",
      args: [LIVE_EPOCH_ID],
      chainId: ARC,
    });
    await waitFor(hash, ARC);
    subscription.refetch();
  }, [address, subscription]);

  /** Mint a real v4 position in the measured pool, through Permit2. */
  const addLiquidity = useCallback(
    async (_slug: PoolSlug, usdcAmount: number) => {
      if (!address || usdcAmount <= 0) return;

      // Size the position from the mUSDC the depositor asked to put in.
      const target = parseUnits(usdcAmount.toFixed(USDC_DECIMALS), USDC_DECIMALS);
      const sqrtLower = sqrtPriceAtTick(TICK_LOWER);
      const sqrtUpper = sqrtPriceAtTick(TICK_UPPER);
      const probe = 10n ** 18n;
      const { amount0: probe0 } = amountsForLiquidity(
        sqrtPriceAtTick(0),
        sqrtLower,
        sqrtUpper,
        probe,
      );
      if (probe0 === 0n) return;
      const liquidity = (target * probe) / probe0;

      const { amount0, amount1 } = amountsForLiquidity(
        sqrtPriceAtTick(0),
        sqrtLower,
        sqrtUpper,
        liquidity,
      );
      const max0 = (amount0 * 102n) / 100n;
      const max1 = (amount1 * 102n) / 100n;

      await ensurePermit2({
        token: MEASURED_POOL_KEY.currency0,
        owner: address,
        spender: POSITION_MANAGER,
        amount: max0,
      });
      await ensurePermit2({
        token: MEASURED_POOL_KEY.currency1,
        owner: address,
        spender: POSITION_MANAGER,
        amount: max1,
      });

      const hash = await writeContract(wagmiConfig, {
        address: POSITION_MANAGER,
        abi: positionManagerAbi,
        functionName: "modifyLiquidities",
        args: [
          encodeMint({
            key: MEASURED_POOL_KEY,
            tickLower: TICK_LOWER,
            tickUpper: TICK_UPPER,
            liquidity,
            amount0Max: max0,
            amount1Max: max1,
            owner: address,
          }),
          BigInt(Math.floor(Date.now() / 1000) + 600),
        ],
        chainId: UNICHAIN,
      });
      await waitFor(hash, UNICHAIN);
      refetchOwned();
    },
    [address, refetchOwned],
  );

  const value = useMemo(
    () => ({
      positions,
      protection,
      start,
      adjust,
      stop,
      addLiquidity,
      ready: Boolean(address),
    }),
    [positions, protection, start, adjust, stop, addLiquidity, address],
  );

  return <LiquidityContext.Provider value={value}>{children}</LiquidityContext.Provider>;
}

export { arcTestnet };
