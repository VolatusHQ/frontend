"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { writeContract } from "wagmi/actions";
import type { PoolSlug } from "./market-data";
import { REAL_POOL } from "./live-market";
import { sigmaStreamAbi } from "./onchain/abis";
import { ARC_USDC, SIGMA_STREAM, USDC_DECIMALS } from "./onchain/addresses";
import { ensureAllowance, ARC, waitFor } from "./onchain/writes";
import { wagmiConfig } from "./onchain/wagmi";

/**
 * Underwriting, as the stream contract records it.
 *
 * A sponsorship is a share of `SigmaStream`'s capacity pool: `postCapacity`
 * mints shares against the pool's current value, so premium already earned
 * accrues to whoever was exposed when it was earned. Withdrawing burns them.
 *
 * The prototype's "impact multiple", "liquidity supported" and sponsor counts
 * are gone. Nothing on chain models them — they were a hand-tuned constant per
 * pool — so the columns that showed them were dropped rather than filled in.
 */

export type Sponsorship = {
  slug: PoolSlug;
  capitalUsd: number;
  /** When this sponsorship began. `null`, not a fabricated timestamp — there
   *  is no event scan here to derive it from, so it is genuinely unknown
   *  rather than "started at the epoch". See `SponsorPanel.tsx`. */
  startedAt: number | null;
};

type Ctx = {
  sponsorships: Partial<Record<PoolSlug, Sponsorship>>;
  sponsor: (slug: PoolSlug, capitalUsd: number) => Promise<void>;
  adjust: (slug: PoolSlug, capitalUsd: number) => Promise<void>;
  withdraw: (slug: PoolSlug) => Promise<void>;
  ready: boolean;
};

const SponsorshipContext = createContext<Ctx | null>(null);

export function useSponsorship(): Ctx {
  const ctx = useContext(SponsorshipContext);
  if (!ctx) throw new Error("useSponsorship must be used inside SponsorshipProvider");
  return ctx;
}

export function SponsorshipProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();

  const shares = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "shares",
    args: address ? [address] : undefined,
    chainId: ARC,
    query: { enabled: Boolean(address) },
  });
  const totalShares = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "totalShares",
    chainId: ARC,
  });
  const capacityPool = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "capacityPool",
    chainId: ARC,
  });

  const refresh = useCallback(() => {
    shares.refetch();
    totalShares.refetch();
    capacityPool.refetch();
  }, [shares, totalShares, capacityPool]);

  const sponsorships: Partial<Record<PoolSlug, Sponsorship>> = useMemo(() => {
    const mine = shares.data ?? 0n;
    if (mine === 0n) return {};
    const total = totalShares.data ?? 0n;
    const pool = capacityPool.data ?? 0n;
    // Shares are worth their pro-rata slice of the pool, which is what a
    // withdrawal would actually return.
    const capital = total === 0n ? 0n : (mine * pool) / total;
    return {
      [REAL_POOL.slug]: {
        slug: REAL_POOL.slug,
        capitalUsd: Number(capital) / 10 ** USDC_DECIMALS,
        startedAt: null,
      },
    };
  }, [shares.data, totalShares.data, capacityPool.data]);

  const post = useCallback(
    async (capitalUsd: number) => {
      if (!address || capitalUsd <= 0) return;
      const amount = parseUnits(capitalUsd.toFixed(USDC_DECIMALS), USDC_DECIMALS);
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
        functionName: "postCapacity",
        args: [amount],
        chainId: ARC,
      });
      await waitFor(hash, ARC);
      refresh();
    },
    [address, refresh],
  );

  const withdraw = useCallback(async () => {
    if (!address) return;
    const mine = shares.data ?? 0n;
    if (mine === 0n) return;
    const hash = await writeContract(wagmiConfig, {
      address: SIGMA_STREAM,
      abi: sigmaStreamAbi,
      functionName: "withdrawCapacity",
      args: [mine],
      chainId: ARC,
    });
    await waitFor(hash, ARC);
    refresh();
  }, [address, shares.data, refresh]);

  const value = useMemo(
    () => ({
      sponsorships,
      sponsor: (_slug: PoolSlug, capitalUsd: number) => post(capitalUsd),
      // Adding to a sponsorship is another deposit; shares simply accumulate.
      adjust: (_slug: PoolSlug, capitalUsd: number) => post(capitalUsd),
      withdraw: () => withdraw(),
      ready: Boolean(address),
    }),
    [sponsorships, post, withdraw, address],
  );

  return <SponsorshipContext.Provider value={value}>{children}</SponsorshipContext.Provider>;
}
