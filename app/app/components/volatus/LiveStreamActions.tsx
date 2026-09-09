"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { Block, Stat } from "./Stat";
import { cn } from "@/app/app/lib/utils";
import { addr, int, usdc } from "@/app/app/lib/format";
import { duration, usdcToNumber } from "@/app/app/lib/onchain/units";
import {
  ARC_USDC,
  LIVE_EPOCH_ID,
  SIGMA_STREAM,
  USDC_DECIMALS,
} from "@/app/app/lib/onchain/addresses";
import { arcTestnet } from "@/app/app/lib/onchain/chains";
import { sigmaStreamAbi } from "@/app/app/lib/onchain/abis";
import { erc20Abi, hasSufficientAllowance } from "@/app/app/lib/onchain/erc20";
import { wagmiConfig } from "@/app/app/lib/onchain/wagmi";
import type { Failed, LiveStream } from "@/app/app/lib/onchain/reads";

/**
 * The write side of `LiveFeed` — real transactions against the one real
 * epoch (`LIVE_EPOCH_ID`, on the deployed `SIGMA_STREAM`). Nothing in the
 * four fixture pools' Protect/Underwrite flows changes; this panel exists
 * because they intentionally do not touch the chain (WIRING.md § What is
 * real and what is a fixture).
 *
 * `adjust` is deployed on the live `SIGMA_STREAM` (2026-09-05 redeploy) but is
 * still not offered here. It exists to let the hedger re-rate a running
 * subscription automatically (BACKEND_HANDOFF.md § Service 3); a human
 * re-rating their own coverage by hand is a different, unreviewed product
 * decision, so no button was added speculatively. See PHASES.md / WIRING.md.
 */

type TxState =
  | { status: "idle" }
  | { status: "pending"; label: string }
  | { status: "error"; message: string };

const PRIMARY_BUTTON =
  "bg-pink text-ink px-s4 py-s2 text-t3 text-center font-medium hover:opacity-90 transition-opacity duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed";
const SECONDARY_BUTTON =
  "text-t3 text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline";

function toUsdcUnits(amount: number): bigint {
  return parseUnits(Math.max(0, amount).toFixed(USDC_DECIMALS), USDC_DECIMALS);
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message.split("\n")[0] : "Transaction failed";
}

/** approve() only if the current allowance falls short — one place, so the
 *  subscriber and underwriter flows can't drift on how they spend USDC. */
async function ensureAllowance(owner: `0x${string}`, amountUsdc: bigint) {
  if (amountUsdc === 0n) return;
  const allowance = await readContract(wagmiConfig, {
    address: ARC_USDC,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, SIGMA_STREAM],
    chainId: arcTestnet.id,
  });
  if (hasSufficientAllowance(allowance, amountUsdc)) return;

  const hash = await writeContract(wagmiConfig, {
    address: ARC_USDC,
    abi: erc20Abi,
    functionName: "approve",
    args: [SIGMA_STREAM, amountUsdc],
    chainId: arcTestnet.id,
  });
  await waitForTransactionReceipt(wagmiConfig, { hash, chainId: arcTestnet.id });
}

function TxStatus({ tx }: { tx: TxState }) {
  if (tx.status === "pending") return <p className="text-t2 text-bone-2 m-0">{tx.label}</p>;
  if (tx.status === "error") return <p className="text-t2 text-down m-0">{tx.message}</p>;
  return null;
}

function SubscriberCard({ stream, address }: { stream: LiveStream; address: `0x${string}` }) {
  const [tx, setTx] = useState<TxState>({ status: "idle" });
  const [notional, setNotional] = useState(0);
  const [rate, setRate] = useState(0);
  const [fundAmount, setFundAmount] = useState(0);

  const subRead = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "subscription",
    args: [LIVE_EPOCH_ID, address],
    chainId: arcTestnet.id,
  });
  const runwayRead = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "runwaySeconds",
    args: [LIVE_EPOCH_ID, address],
    chainId: arcTestnet.id,
  });

  const sub = subRead.data;
  const subscribed = sub !== undefined && sub.ratePerSecond !== 0n;
  const e = stream.epoch;
  const canClaim = subscribed && !sub.claimed && e?.reported === true;
  const canReclaim = subscribed && !sub.claimed && stream.refundable;

  const refetchAll = () => {
    subRead.refetch();
    runwayRead.refetch();
  };

  async function run(label: string, action: () => Promise<void>) {
    setTx({ status: "pending", label });
    try {
      await action();
      setTx({ status: "idle" });
      refetchAll();
    } catch (err) {
      setTx({ status: "error", message: errorMessage(err) });
    }
  }

  async function doFund(amountUsd: number) {
    const amount = toUsdcUnits(amountUsd);
    await ensureAllowance(address, amount);
    const hash = await writeContract(wagmiConfig, {
      address: SIGMA_STREAM,
      abi: sigmaStreamAbi,
      functionName: "fund",
      args: [LIVE_EPOCH_ID, amount],
      chainId: arcTestnet.id,
    });
    await waitForTransactionReceipt(wagmiConfig, { hash, chainId: arcTestnet.id });
  }

  return (
    <Block title="Subscriber" aside="stream coverage · Arc" plate>
      {subscribed ? (
        <div className="flex flex-col gap-s4">
          <div className="flex flex-wrap gap-x-s6 gap-y-s3">
            <Stat layout="value-first" label="Funded" value={`$${usdc(usdcToNumber(sub.funded))}`} />
            <Stat
              layout="value-first"
              label="Coverage notional"
              value={`$${usdc(usdcToNumber(sub.coverageNotional))}`}
            />
            <Stat
              layout="value-first"
              label="Runway"
              value={runwayRead.data !== undefined ? duration(runwayRead.data) : "—"}
            />
          </div>

          {canClaim || canReclaim ? (
            <button
              type="button"
              onClick={() =>
                run(canClaim ? "Claiming…" : "Reclaiming unspent premium…", async () => {
                  const hash = await writeContract(wagmiConfig, {
                    address: SIGMA_STREAM,
                    abi: sigmaStreamAbi,
                    functionName: canClaim ? "claim" : "reclaimUnreported",
                    args: [LIVE_EPOCH_ID],
                    chainId: arcTestnet.id,
                  });
                  await waitForTransactionReceipt(wagmiConfig, { hash, chainId: arcTestnet.id });
                })
              }
              className={PRIMARY_BUTTON}
            >
              {canClaim ? "Claim payout" : "Reclaim unspent premium"}
            </button>
          ) : (
            <div className="flex items-end gap-s3">
              <label className="flex flex-col gap-s1 flex-1">
                <span className="lbl">Top up (USDC)</span>
                <input
                  type="number"
                  min={0}
                  value={fundAmount}
                  onChange={(ev) => setFundAmount(Math.max(0, Number(ev.target.value) || 0))}
                  className="border border-hair px-s3 py-s2 text-t3 num bg-transparent"
                />
              </label>
              <button
                type="button"
                disabled={fundAmount <= 0}
                onClick={() =>
                  run("Approving + funding…", async () => {
                    await doFund(fundAmount);
                    setFundAmount(0);
                  })
                }
                className={PRIMARY_BUTTON}
              >
                Fund
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              run("Cancelling…", async () => {
                const hash = await writeContract(wagmiConfig, {
                  address: SIGMA_STREAM,
                  abi: sigmaStreamAbi,
                  functionName: "cancel",
                  args: [LIVE_EPOCH_ID],
                  chainId: arcTestnet.id,
                });
                await waitForTransactionReceipt(wagmiConfig, { hash, chainId: arcTestnet.id });
              })
            }
            className={`${SECONDARY_BUTTON} self-start`}
          >
            Cancel stream
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-s3">
          <div className="grid grid-cols-3 gap-s3">
            <label className="flex flex-col gap-s1">
              <span className="lbl">Coverage (USDC)</span>
              <input
                type="number"
                min={0}
                value={notional}
                onChange={(ev) => setNotional(Math.max(0, Number(ev.target.value) || 0))}
                className="border border-hair px-s3 py-s2 text-t3 num bg-transparent"
              />
            </label>
            <label className="flex flex-col gap-s1">
              <span className="lbl">Rate (USDC/sec)</span>
              <input
                type="number"
                min={0}
                step="0.000001"
                value={rate}
                onChange={(ev) => setRate(Math.max(0, Number(ev.target.value) || 0))}
                className="border border-hair px-s3 py-s2 text-t3 num bg-transparent"
              />
            </label>
            <label className="flex flex-col gap-s1">
              <span className="lbl">Fund (USDC)</span>
              <input
                type="number"
                min={0}
                value={fundAmount}
                onChange={(ev) => setFundAmount(Math.max(0, Number(ev.target.value) || 0))}
                className="border border-hair px-s3 py-s2 text-t3 num bg-transparent"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={notional <= 0 || rate <= 0}
            onClick={() =>
              run("Subscribing…", async () => {
                const hash = await writeContract(wagmiConfig, {
                  address: SIGMA_STREAM,
                  abi: sigmaStreamAbi,
                  functionName: "subscribe",
                  args: [LIVE_EPOCH_ID, toUsdcUnits(rate), toUsdcUnits(notional)],
                  chainId: arcTestnet.id,
                });
                await waitForTransactionReceipt(wagmiConfig, { hash, chainId: arcTestnet.id });
                if (fundAmount > 0) await doFund(fundAmount);
              })
            }
            className={PRIMARY_BUTTON}
          >
            Start stream
          </button>
        </div>
      )}
      <TxStatus tx={tx} />
    </Block>
  );
}

function UnderwriterCard({ address }: { address: `0x${string}` }) {
  const [tx, setTx] = useState<TxState>({ status: "idle" });
  const [amount, setAmount] = useState(0);

  const sharesRead = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "shares",
    args: [address],
    chainId: arcTestnet.id,
  });
  const totalSharesRead = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "totalShares",
    chainId: arcTestnet.id,
  });

  const myShares = sharesRead.data ?? 0n;
  const totalShares = totalSharesRead.data ?? 0n;

  const refetchAll = () => {
    sharesRead.refetch();
    totalSharesRead.refetch();
  };

  async function run(label: string, action: () => Promise<void>) {
    setTx({ status: "pending", label });
    try {
      await action();
      setTx({ status: "idle" });
      refetchAll();
    } catch (err) {
      setTx({ status: "error", message: errorMessage(err) });
    }
  }

  return (
    <Block title="Underwriter" aside="capacity · Arc" plate>
      <div className="flex flex-col gap-s4">
        <Stat
          layout="value-first"
          label="Your shares"
          value={int(usdcToNumber(myShares))}
          sub={totalShares > 0n ? `${((Number(myShares) / Number(totalShares)) * 100).toFixed(2)}% of pool` : undefined}
        />

        <div className="flex items-end gap-s3">
          <label className="flex flex-col gap-s1 flex-1">
            <span className="lbl">Post capacity (USDC)</span>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(ev) => setAmount(Math.max(0, Number(ev.target.value) || 0))}
              className="border border-hair px-s3 py-s2 text-t3 num bg-transparent"
            />
          </label>
          <button
            type="button"
            disabled={amount <= 0}
            onClick={() =>
              run("Approving + posting…", async () => {
                const units = toUsdcUnits(amount);
                await ensureAllowance(address, units);
                const hash = await writeContract(wagmiConfig, {
                  address: SIGMA_STREAM,
                  abi: sigmaStreamAbi,
                  functionName: "postCapacity",
                  args: [units],
                  chainId: arcTestnet.id,
                });
                await waitForTransactionReceipt(wagmiConfig, { hash, chainId: arcTestnet.id });
                setAmount(0);
              })
            }
            className={PRIMARY_BUTTON}
          >
            Post
          </button>
        </div>

        {myShares > 0n ? (
          <button
            type="button"
            onClick={() =>
              run("Withdrawing…", async () => {
                const hash = await writeContract(wagmiConfig, {
                  address: SIGMA_STREAM,
                  abi: sigmaStreamAbi,
                  functionName: "withdrawCapacity",
                  args: [myShares],
                  chainId: arcTestnet.id,
                });
                await waitForTransactionReceipt(wagmiConfig, { hash, chainId: arcTestnet.id });
              })
            }
            className={`${SECONDARY_BUTTON} self-start`}
          >
            Withdraw all capacity
          </button>
        ) : null}
      </div>
      <TxStatus tx={tx} />
    </Block>
  );
}

export function LiveStreamActions({
  stream,
  stacked = false,
}: {
  stream: LiveStream | Failed;
  /** Single column regardless of viewport — for a narrow rail, not the full-width layout. */
  stacked?: boolean;
}) {
  const { address } = useAccount();

  return (
    <div className="flex flex-col gap-s4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-s4 gap-y-s1">
        <span className="lbl">Live actions</span>
        <span className="num text-t2 text-bone-3">
          Arc Testnet · {addr(SIGMA_STREAM)} · real transactions
        </span>
      </div>

      {!address ? (
        <p className="text-t3 text-bone-2 m-0">Connect a wallet above to subscribe or post capacity.</p>
      ) : !stream.ok ? (
        <p className="text-t3 text-bone-2 m-0">Could not reach Arc. Try again shortly.</p>
      ) : (
        <div className={cn("grid grid-cols-1 gap-s6 items-start", !stacked && "lg:grid-cols-2")}>
          <SubscriberCard stream={stream} address={address} />
          <UnderwriterCard address={address} />
        </div>
      )}
    </div>
  );
}
