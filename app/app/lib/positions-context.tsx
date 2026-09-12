"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { erc20Abi, parseUnits, type Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { writeContract } from "wagmi/actions";
import type { PoolSlug } from "./market-data";
import { sigmaVaultAbi, poolSwapTestAbi } from "./onchain/abis";
import { MOCK_USDC, SIGMA_VAULT, SWAP_ROUTER, USDC_DECIMALS } from "./onchain/addresses";
import { readEpochPositions, type EpochPosition } from "./onchain/epoch-positions";
import { readWalletTrades } from "./onchain/wallet-trades";
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE, volPoolKey } from "./onchain/v4";
import { ensureAllowance, ensureChain, UNICHAIN, waitFor } from "./onchain/writes";
import { wagmiConfig } from "./onchain/wagmi";

/**
 * The connected wallet's variance legs, read from the tokens themselves.
 *
 * This used to hold two invented positions and a seeded trade history in
 * memory. Both are now the chain's: a position is simply the balance of an
 * epoch's VAR-LONG and VAR-SHORT ERC-20s, and `buy` sends real transactions.
 *
 * Entry price, cost basis and P/L are gone, because the protocol does not
 * record them. Nothing on chain knows what anyone paid.
 */

export type Side = "long" | "short";

export type Position = {
  /** Units of VAR-LONG held, 6dp scaled to a plain number. */
  longSize: number;
  /** Units of VAR-SHORT held. */
  shortSize: number;
};

export type Trade = {
  id: string;
  slug: PoolSlug;
  side: Side;
  tokens: number;
  usdcAmount: number;
  price: number;
  timestamp: number;
};

type Ctx = {
  positions: Partial<Record<PoolSlug, Position>>;
  trades: Trade[];
  /** Sends real transactions. Long buys the leg; short mints a pair and sells the long. */
  buy: (slug: PoolSlug, side: Side, usdcAmount: number) => Promise<void>;
  /** Which epoch's legs these are, and where the market stands. */
  ready: boolean;
  /**
   * Every epoch's STORM/CALM holdings the wallet still has, current epoch
   * included — unlike `positions`, this does not go blank the moment the
   * epoch rolls. A settled epoch's row stays until its `redeem` is called.
   */
  epochPositions: EpochPosition[];
  /** `VolatusVault.redeem` for a settled epoch's leg. No-op until settled. */
  redeem: (epochId: bigint, isLong: boolean, amount: number) => Promise<void>;
  /** True while `epochPositions`/`trades` are still being reconstructed from
   *  chain — both scan several blocks' worth of logs, so this can take a
   *  few seconds. Without it, an in-flight fetch and a genuinely empty
   *  result look identical, which is how "no trades" was read as broken
   *  rather than as loading. */
  loadingHistory: boolean;
};

const PositionsContext = createContext<Ctx | null>(null);

export function usePositions(): Ctx {
  const ctx = useContext(PositionsContext);
  if (!ctx) throw new Error("usePositions must be used inside PositionsProvider");
  return ctx;
}

/** The epoch's legs and pool orientation, which the write paths need. */
export type EpochLegs = {
  slug: PoolSlug;
  epochId: bigint;
  longToken: Address;
  shortToken: Address;
  longIsCurrency0: boolean;
  hasVolPool: boolean;
};

/**
 * The same thing as it crosses the server/client boundary. `epochId` travels
 * as a string because a bigint cannot be serialized into a client component's
 * props — it is converted back the moment it lands.
 */
export type SerializableLegs = Omit<EpochLegs, "epochId"> & { epochId: string };

const LegsContext = createContext<EpochLegs | null>(null);

/** Set by the Markets pages, which already read the epoch server-side. */
export function EpochLegsProvider({
  legs,
  children,
}: {
  legs: SerializableLegs | null;
  children: React.ReactNode;
}) {
  const resolved = useMemo(
    () => (legs ? { ...legs, epochId: BigInt(legs.epochId) } : null),
    [legs],
  );
  return <LegsContext.Provider value={resolved}>{children}</LegsContext.Provider>;
}

export function PositionsProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const legs = useContext(LegsContext);

  const longBalance = useReadContract({
    address: legs?.longToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: UNICHAIN,
    query: { enabled: Boolean(address && legs) },
  });
  const shortBalance = useReadContract({
    address: legs?.shortToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: UNICHAIN,
    query: { enabled: Boolean(address && legs) },
  });

  const positions: Partial<Record<PoolSlug, Position>> = useMemo(() => {
    if (!legs) return {};
    const longSize = Number(longBalance.data ?? 0n) / 10 ** USDC_DECIMALS;
    const shortSize = Number(shortBalance.data ?? 0n) / 10 ** USDC_DECIMALS;
    if (longSize === 0 && shortSize === 0) return {};
    return { [legs.slug]: { longSize, shortSize } };
  }, [legs, longBalance.data, shortBalance.data]);

  const epochPositionsQuery = useQuery({
    queryKey: ["epoch-positions", address],
    queryFn: () => readEpochPositions(address!),
    enabled: Boolean(address),
  });
  const epochPositions = epochPositionsQuery.data ?? [];

  // Reconstructed entirely from the wallet's own on-chain Transfer/Swap
  // history — no backend, nothing that resets on a restart or a page reload.
  const tradesQuery = useQuery({
    queryKey: ["wallet-trades", address],
    queryFn: () => readWalletTrades(address!),
    enabled: Boolean(address),
  });
  const trades = tradesQuery.data ?? [];

  const redeem = useCallback(
    async (epochId: bigint, isLong: boolean, amount: number) => {
      if (!address || amount <= 0) return;
      await ensureChain(UNICHAIN);
      const units = parseUnits(amount.toFixed(USDC_DECIMALS), USDC_DECIMALS);
      const hash = await writeContract(wagmiConfig, {
        address: SIGMA_VAULT,
        abi: sigmaVaultAbi,
        functionName: "redeem",
        args: [epochId, isLong, units],
        chainId: UNICHAIN,
      });
      await waitFor(hash, UNICHAIN);
      epochPositionsQuery.refetch();
      tradesQuery.refetch();
      longBalance.refetch();
      shortBalance.refetch();
    },
    [address, epochPositionsQuery, tradesQuery, longBalance, shortBalance],
  );

  const buy = useCallback(
    async (slug: PoolSlug, side: Side, usdcAmount: number) => {
      if (!address || !legs || usdcAmount <= 0) return;
      const amount = parseUnits(usdcAmount.toFixed(USDC_DECIMALS), USDC_DECIMALS);

      // Both sides trade on Unichain; a wallet left on Arc (from the Live
      // actions panel) must be switched back before the first write.
      await ensureChain(UNICHAIN);

      if (side === "long") {
        // Buying the leg in the variance pool. This is the trade that moves
        // implied volatility — the price it leaves behind is the oracle's answer.
        if (!legs.hasVolPool) throw new Error("No variance pool is registered for this epoch");
        await ensureAllowance({
          token: MOCK_USDC,
          owner: address,
          spender: SWAP_ROUTER,
          amount,
          chainId: UNICHAIN,
        });
        const zeroForOne = !legs.longIsCurrency0;
        const hash = await writeContract(wagmiConfig, {
          address: SWAP_ROUTER,
          abi: poolSwapTestAbi,
          functionName: "swap",
          args: [
            volPoolKey(legs.longToken),
            {
              zeroForOne,
              amountSpecified: -amount, // exact input
              sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE + 1n : MAX_SQRT_PRICE - 1n,
            },
            { takeClaims: false, settleUsingBurn: false },
            "0x",
          ],
          chainId: UNICHAIN,
        });
        await waitFor(hash, UNICHAIN);
      } else {
        // Short volatility is expressed by minting a pair and selling the long
        // leg: what is left is VAR-SHORT, and the sale pushes implied vol down.
        await ensureAllowance({
          token: MOCK_USDC,
          owner: address,
          spender: SIGMA_VAULT,
          amount,
          chainId: UNICHAIN,
        });
        const mint = await writeContract(wagmiConfig, {
          address: SIGMA_VAULT,
          abi: sigmaVaultAbi,
          functionName: "mintPair",
          args: [legs.epochId, amount],
          chainId: UNICHAIN,
        });
        await waitFor(mint, UNICHAIN);

        if (legs.hasVolPool) {
          await ensureAllowance({
            token: legs.longToken,
            owner: address,
            spender: SWAP_ROUTER,
            amount,
            chainId: UNICHAIN,
          });
          const zeroForOne = legs.longIsCurrency0;
          const sell = await writeContract(wagmiConfig, {
            address: SWAP_ROUTER,
            abi: poolSwapTestAbi,
            functionName: "swap",
            args: [
              volPoolKey(legs.longToken),
              {
                zeroForOne,
                amountSpecified: -amount,
                sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE + 1n : MAX_SQRT_PRICE - 1n,
              },
              { takeClaims: false, settleUsingBurn: false },
              "0x",
            ],
            chainId: UNICHAIN,
          });
          await waitFor(sell, UNICHAIN);
        }
      }

      longBalance.refetch();
      shortBalance.refetch();
      epochPositionsQuery.refetch();
      tradesQuery.refetch();
    },
    [address, legs, longBalance, shortBalance, epochPositionsQuery, tradesQuery],
  );

  const loadingHistory = Boolean(address) && (epochPositionsQuery.isLoading || tradesQuery.isLoading);

  const value = useMemo(
    () => ({
      positions,
      trades,
      buy,
      ready: Boolean(address && legs),
      epochPositions,
      redeem,
      loadingHistory,
    }),
    [positions, trades, buy, address, legs, epochPositions, redeem, loadingHistory],
  );

  return <PositionsContext.Provider value={value}>{children}</PositionsContext.Provider>;
}
