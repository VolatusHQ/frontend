"use client";

import { erc20Abi, type Address } from "viem";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { permit2Abi } from "./abis";
import { PERMIT2 } from "./addresses";
import { arcTestnet, unichainSepolia } from "./chains";
import { wagmiConfig } from "./wagmi";

/**
 * The bits every write path repeats: approve if short, send, wait.
 *
 * Kept here rather than in each panel so the two chains cannot drift — an Arc
 * write sent against Unichain's id would find a different contract at the same
 * address, which is the kind of mistake that costs a demo.
 */

export const UNICHAIN = unichainSepolia.id;
export const ARC = arcTestnet.id;

/** The two chains the wagmi config knows. Anything else is a typo, not a chain. */
export type ChainId = typeof UNICHAIN | typeof ARC;

/** Wait for the receipt so the next step reads post-confirmation state. */
export async function waitFor(hash: `0x${string}`, chainId: ChainId) {
  await waitForTransactionReceipt(wagmiConfig, { hash, chainId });
}

/**
 * `approve` only when the current allowance falls short.
 *
 * Approves exactly `amount` rather than max: these are testnet mocks with an
 * open faucet, so there is no convenience worth a standing unlimited approval.
 */
export async function ensureAllowance(args: {
  token: Address;
  owner: Address;
  spender: Address;
  amount: bigint;
  chainId: ChainId;
}) {
  const { token, owner, spender, amount, chainId } = args;
  if (amount === 0n) return;

  const allowance = await readContract(wagmiConfig, {
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
    chainId,
  });
  if (allowance >= amount) return;

  const hash = await writeContract(wagmiConfig, {
    address: token,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
    chainId,
  });
  await waitFor(hash, chainId);
}

/**
 * Permit2 is a two-step allowance and both steps are required.
 *
 * The token is approved *to Permit2*, then Permit2 is told which spender may
 * pull it and until when. PositionManager reads only the second one, so
 * skipping it leaves a normal-looking ERC-20 allowance that still cannot be
 * spent — a confusing failure that looks like a bug in the mint.
 */
export async function ensurePermit2(args: {
  token: Address;
  owner: Address;
  spender: Address;
  amount: bigint;
}) {
  const { token, owner, spender, amount } = args;
  if (amount === 0n) return;

  await ensureAllowance({ token, owner, spender: PERMIT2, amount, chainId: UNICHAIN });

  const [allowed, expiration] = await readContract(wagmiConfig, {
    address: PERMIT2,
    abi: permit2Abi,
    functionName: "allowance",
    args: [owner, token, spender],
    chainId: UNICHAIN,
  });

  const now = Math.floor(Date.now() / 1000);
  if (allowed >= amount && Number(expiration) > now + 60) return;

  // uint160 max amount, and an expiry a day out — long enough for a session,
  // short enough that a stale approval does not linger.
  const hash = await writeContract(wagmiConfig, {
    address: PERMIT2,
    abi: permit2Abi,
    functionName: "approve",
    args: [token, spender, (1n << 160n) - 1n, now + 86_400],
    chainId: UNICHAIN,
  });
  await waitFor(hash, UNICHAIN);
}

/** First line of a revert, which is the part that names the error. */
export function errorMessage(e: unknown): string {
  if (!(e instanceof Error)) return "Transaction failed";
  const first = e.message.split("\n")[0].trim();
  return first.length > 160 ? `${first.slice(0, 157)}…` : first;
}
