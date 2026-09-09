"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { erc20Abi, parseUnits, type Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { writeContract } from "wagmi/actions";
import { Block, Stat } from "./Stat";
import { dec, int } from "@/app/app/lib/format";
import {
  MEASURED_POOL_KEY,
  MOCK_USDC,
  MOCK_WETH,
  POSITION_MANAGER,
  USDC_DECIMALS,
  WETH_DECIMALS,
} from "@/app/app/lib/onchain/addresses";
import { mintableErc20Abi, positionManagerAbi } from "@/app/app/lib/onchain/abis";
import { amountsForLiquidity, sqrtPriceAtTick } from "@/app/app/lib/onchain/v4";
import {
  encodeClose,
  encodeMint,
  readOwnedPositions,
  type OwnedPosition,
} from "@/app/app/lib/onchain/positions";
import { ensurePermit2, UNICHAIN, waitFor } from "@/app/app/lib/onchain/writes";
import { txMessage, useTx } from "@/app/app/lib/onchain/useTx";
import { wagmiConfig } from "@/app/app/lib/onchain/wagmi";
import type { LiveMarket } from "@/app/app/lib/onchain/reads";

/**
 * Real liquidity in the pool the protocol measures.
 *
 * The range is fixed at the one the pool was seeded with (-6000 to 6000 around
 * the 1:1 initialization). A range picker would imply this pool has a price
 * worth having a view on; it does not — it pairs a 6dp mock with an 18dp mock
 * at a raw 1:1, and exists so variance has something to be measured in.
 *
 * Size is expressed as liquidity `L` rather than token amounts for the same
 * reason: with mismatched decimals at a raw 1:1 price, "amount of mUSDC" is a
 * misleading handle. The exact amounts `L` will pull are shown before signing.
 */

const TICK_LOWER = -6000;
const TICK_UPPER = 6000;

const PRESETS: Array<{ label: string; liquidity: bigint }> = [
  { label: "1×", liquidity: 10n ** 18n },
  { label: "10×", liquidity: 10n ** 19n },
  { label: "50×", liquidity: 5n * 10n ** 19n },
];

const PRIMARY =
  "bg-pink text-ink px-s4 py-s2 text-t3 text-center font-medium hover:opacity-90 transition-opacity duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed";
const SECONDARY =
  "border border-hair-lit px-s4 py-s2 text-t3 text-center font-medium text-bone hover:bg-panel-2 transition-colors duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed";

export function LiquidityPanel({ market }: { market: LiveMarket }) {
  const { address } = useAccount();
  const router = useRouter();
  const { state, run, busy } = useTx();
  const status = txMessage(state);

  const [liquidity, setLiquidity] = useState<bigint>(PRESETS[0].liquidity);

  // A log scan, cached like every other read rather than run from an effect.
  const {
    data: positions,
    isPending: positionsPending,
    refetch: refetchPositions,
  } = useQuery({
    queryKey: ["positions", address],
    queryFn: () => readOwnedPositions(address!),
    enabled: Boolean(address),
  });

  const usdcBalance = useReadContract({
    address: MOCK_USDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: UNICHAIN,
    query: { enabled: Boolean(address) },
  });
  const wethBalance = useReadContract({
    address: MOCK_WETH,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: UNICHAIN,
    query: { enabled: Boolean(address) },
  });

  const refresh = () => {
    usdcBalance.refetch();
    wethBalance.refetch();
    refetchPositions();
    router.refresh();
  };

  // What this liquidity will actually cost, at the pool's current price.
  const { amount0, amount1 } = amountsForLiquidity(
    market.measured.sqrtPriceX96,
    sqrtPriceAtTick(TICK_LOWER),
    sqrtPriceAtTick(TICK_UPPER),
    liquidity,
  );
  // A little headroom: the contract recomputes amounts exactly and reverts if
  // they exceed these, and our sqrt math is float-derived.
  const max0 = (amount0 * 102n) / 100n;
  const max1 = (amount1 * 102n) / 100n;

  async function faucet(token: Address, amount: bigint, label: string) {
    if (!address) return;
    await run(`Minting ${label}…`, async () => {
      const hash = await writeContract(wagmiConfig, {
        address: token,
        abi: mintableErc20Abi,
        functionName: "mint",
        args: [address, amount],
        chainId: UNICHAIN,
      });
      await waitFor(hash, UNICHAIN);
      refresh();
    });
  }

  async function deposit() {
    if (!address) return;
    await run("Approving and minting the position…", async () => {
      await ensurePermit2({ token: MOCK_USDC, owner: address, spender: POSITION_MANAGER, amount: max0 });
      await ensurePermit2({ token: MOCK_WETH, owner: address, spender: POSITION_MANAGER, amount: max1 });

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
      refresh();
    });
  }

  async function close(position: OwnedPosition) {
    if (!address) return;
    await run(`Closing position #${position.tokenId}…`, async () => {
      const hash = await writeContract(wagmiConfig, {
        address: POSITION_MANAGER,
        abi: positionManagerAbi,
        functionName: "modifyLiquidities",
        args: [
          encodeClose({
            key: MEASURED_POOL_KEY,
            tokenId: position.tokenId,
            liquidity: position.liquidity,
            recipient: address,
          }),
          BigInt(Math.floor(Date.now() / 1000) + 600),
        ],
        chainId: UNICHAIN,
      });
      await waitFor(hash, UNICHAIN);
      refresh();
    });
  }

  return (
    <div className="flex flex-col gap-s6">
      <div className="flex flex-wrap gap-x-s6 gap-y-s4">
        <Stat
          layout="value-first"
          size="lg"
          label="Pool liquidity"
          value={int(Number(market.measured.liquidity) / 1e18)}
          sub={`tick ${market.measured.tick}`}
        />
        <Stat
          layout="value-first"
          label="Your mUSDC"
          value={address ? int(Number(usdcBalance.data ?? 0n) / 10 ** USDC_DECIMALS) : "—"}
        />
        <Stat
          layout="value-first"
          label="Your mWETH"
          value={address ? dec(Number(wethBalance.data ?? 0n) / 10 ** WETH_DECIMALS, 4) : "—"}
        />
      </div>

      {!address ? (
        <p className="text-t3 text-bone-2 m-0">Connect a wallet to deposit liquidity.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-s6 items-start">
          <Block title="Deposit" aside="Uniswap v4 PositionManager" plate>
            <div className="flex flex-col gap-s4">
              <div className="flex flex-col gap-s2">
                <span className="lbl">Size</span>
                <div className="flex gap-s2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setLiquidity(p.liquidity)}
                      aria-pressed={liquidity === p.liquidity}
                      className={
                        liquidity === p.liquidity
                          ? "px-s4 py-s2 text-t3 num border border-hair-lit bg-panel-2 text-bone"
                          : "px-s4 py-s2 text-t3 num border border-hair text-bone-2 hover:text-bone"
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ruled pt-s3 flex flex-wrap gap-x-s6 gap-y-s3">
                <Stat
                  layout="value-first"
                  label="mUSDC in"
                  value={dec(Number(amount0) / 10 ** USDC_DECIMALS, 6)}
                />
                <Stat
                  layout="value-first"
                  label="mWETH in"
                  value={dec(Number(amount1) / 10 ** WETH_DECIMALS, 6)}
                />
                <Stat layout="value-first" label="Range" value={`${TICK_LOWER} … ${TICK_UPPER}`} sub="ticks" />
              </div>

              <button type="button" onClick={deposit} disabled={busy} className={PRIMARY}>
                Deposit liquidity
              </button>

              <div className="ruled pt-s3 flex flex-wrap gap-s2">
                <button
                  type="button"
                  onClick={() => faucet(MOCK_USDC, parseUnits("10000", USDC_DECIMALS), "10,000 mUSDC")}
                  disabled={busy}
                  className={SECONDARY}
                >
                  Get mUSDC
                </button>
                <button
                  type="button"
                  onClick={() => faucet(MOCK_WETH, parseUnits("10", WETH_DECIMALS), "10 mWETH")}
                  disabled={busy}
                  className={SECONDARY}
                >
                  Get mWETH
                </button>
              </div>
            </div>
          </Block>

          <Block title="Your positions" aside="ERC-721" plate>
            {positionsPending ? (
              <p className="text-t3 text-bone-2 m-0">Looking for positions…</p>
            ) : !positions || positions.length === 0 ? (
              <p className="text-t3 text-bone-2 m-0">
                No open positions in this pool. Depositing mints an NFT you own outright.
              </p>
            ) : (
              <ul className="list-none p-0 m-0 flex flex-col">
                {positions.map((p) => (
                  <li
                    key={p.tokenId.toString()}
                    className="flex flex-wrap items-end justify-between gap-s3 py-s3 border-t border-hair-2 first:border-t-0"
                  >
                    <div className="flex flex-wrap gap-x-s5 gap-y-s2">
                      <Stat layout="value-first" label="Token" value={`#${p.tokenId}`} />
                      <Stat
                        layout="value-first"
                        label="Liquidity"
                        value={dec(Number(p.liquidity) / 1e18, 4)}
                      />
                      <Stat
                        layout="value-first"
                        label="Range"
                        value={`${p.tickLower} … ${p.tickUpper}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => close(p)}
                      disabled={busy}
                      className={SECONDARY}
                    >
                      Withdraw
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      )}

      {status ? (
        <p className={`text-t2 m-0 ${status.tone === "bad" ? "text-down" : "text-bone-2"}`}>
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
