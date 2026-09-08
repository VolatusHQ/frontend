/**
 * The USDC allowance the write paths share.
 *
 * `fund`, `postCapacity` and `subscribe`'s follow-up `fund` all pull USDC via
 * `safeTransferFrom`, so every one of them needs an `approve` first. One
 * helper here means the allowance check and the approve amount can't drift
 * between the subscriber card and the underwriter card.
 */

import { erc20Abi } from "viem";
import { ARC_USDC } from "./addresses";

export { erc20Abi, ARC_USDC };

/** True when the current allowance already covers `amount`. */
export function hasSufficientAllowance(allowance: bigint | undefined, amount: bigint): boolean {
  return allowance !== undefined && allowance >= amount;
}
