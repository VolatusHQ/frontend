/**
 * Uniswap v4 primitives the app needs: pool keys, pool ids, and the price
 * conversions around `sqrtPriceX96`.
 *
 * Two things here are easy to get wrong and produce a plausible wrong number
 * rather than an error, which is the failure mode WIRING.md exists to prevent:
 *
 *  1. **A pool id is the hash of its key.** Never store an id without being
 *     able to rebuild the key it came from — `MEASURED_POOL_ID` is verified
 *     against `poolId(MEASURED_POOL_KEY)` in the app's own tests-by-inspection
 *     (`cast keccak $(cast abi-encode …)` reproduces it exactly).
 *  2. **`sqrtPriceX96` is a ratio of raw units**, not of human amounts. The
 *     measured pool pairs a 6dp token with an 18dp one and was initialized 1:1
 *     in *raw* units, so its "price" is ~1e-12 mWETH per mUSDC and means
 *     nothing economically. It is a substrate for measuring variance, not a
 *     priced market — so the UI shows its tick, never a dollar figure.
 */

import { encodeAbiParameters, keccak256, type Address, type Hex } from "viem";
import { MOCK_USDC, POOL_FEE, TICK_SPACING } from "./addresses";

export type PoolKey = {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
};

const POOL_KEY_ABI = [
  {
    type: "tuple",
    components: [
      { name: "currency0", type: "address" },
      { name: "currency1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickSpacing", type: "int24" },
      { name: "hooks", type: "address" },
    ],
  },
] as const;

/** `PoolId.toId()` — keccak of the abi-encoded key. */
export function poolId(key: PoolKey): Hex {
  return keccak256(encodeAbiParameters(POOL_KEY_ABI, [key]));
}

/** v4 sorts currencies by address; everything downstream depends on the order. */
export function sortCurrencies(a: Address, b: Address): [Address, Address] {
  return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
}

/**
 * The vol pool for an epoch's VAR-LONG leg: the leg against mUSDC, same fee
 * tier and spacing as everything else here, and no hook. Built the same way
 * `SettleAndRoll.s.sol` builds it, so the id matches what the oracle holds.
 */
export function volPoolKey(longToken: Address): PoolKey {
  const [currency0, currency1] = sortCurrencies(longToken, MOCK_USDC);
  return {
    currency0,
    currency1,
    fee: POOL_FEE,
    tickSpacing: TICK_SPACING,
    hooks: "0x0000000000000000000000000000000000000000",
  };
}

/* ------------------------------------------------------------------ */
/* Price math                                                          */
/* ------------------------------------------------------------------ */

const Q96 = 2 ** 96;

/** Swap bounds. A swap that specifies no limit still needs one. */
export const MIN_SQRT_PRICE = 4295128739n;
export const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n;

/**
 * Raw currency1-per-currency0 from `sqrtPriceX96`.
 *
 * Number, not bigint: this is only ever drawn, never settled on, and the
 * squaring would otherwise need 192 bits of precision for no visible gain.
 */
export function priceFromSqrtX96(sqrtPriceX96: bigint): number {
  const r = Number(sqrtPriceX96) / Q96;
  return r * r;
}

/**
 * VAR-LONG's price in mUSDC, from the vol pool's `sqrtPriceX96`.
 *
 * Both sides are 6dp — the legs inherit the collateral's decimals — so no
 * decimal adjustment applies, only the direction. It is a price in [0, 1]:
 * a VAR-LONG plus a VAR-SHORT is always worth exactly one unit of collateral.
 */
export function varLongPrice(sqrtPriceX96: bigint, longIsCurrency0: boolean): number {
  const raw = priceFromSqrtX96(sqrtPriceX96);
  return longIsCurrency0 ? raw : 1 / raw;
}

/** Tick to its price ratio, `1.0001^tick`. For labelling a range, not settling. */
export function priceFromTick(tick: number): number {
  return 1.0001 ** tick;
}

/** Nearest usable tick — v4 rejects a range that is not on the spacing grid. */
export function roundToSpacing(tick: number, spacing: number = TICK_SPACING): number {
  return Math.round(tick / spacing) * spacing;
}

/**
 * `sqrtPriceX96` at a tick.
 *
 * TickMath does this with exact fixed-point bit twiddling; this is the float
 * version, which is accurate to well under a basis point across the tick range
 * the app uses. That is fine *because of how the result is used*: it sizes a
 * deposit, and the amounts actually pulled are recomputed on chain from the
 * liquidity figure, bounded by the maxima the caller passes. It must never be
 * used to price or settle anything.
 */
export function sqrtPriceAtTick(tick: number): bigint {
  return BigInt(Math.floor(Math.sqrt(1.0001 ** tick) * Q96));
}

function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  return (a * b) / denominator;
}

const Q96n = 1n << 96n;

/**
 * The token amounts a given liquidity needs, for a range straddling the price.
 * Mirrors `LiquidityAmounts.getAmountsForLiquidity`.
 */
export function amountsForLiquidity(
  sqrtPriceX96: bigint,
  sqrtLowerX96: bigint,
  sqrtUpperX96: bigint,
  liquidity: bigint,
): { amount0: bigint; amount1: bigint } {
  const [lower, upper] =
    sqrtLowerX96 > sqrtUpperX96 ? [sqrtUpperX96, sqrtLowerX96] : [sqrtLowerX96, sqrtUpperX96];

  if (sqrtPriceX96 <= lower) {
    return { amount0: amount0For(lower, upper, liquidity), amount1: 0n };
  }
  if (sqrtPriceX96 < upper) {
    return {
      amount0: amount0For(sqrtPriceX96, upper, liquidity),
      amount1: amount1For(lower, sqrtPriceX96, liquidity),
    };
  }
  return { amount0: 0n, amount1: amount1For(lower, upper, liquidity) };
}

function amount0For(sqrtA: bigint, sqrtB: bigint, liquidity: bigint): bigint {
  if (sqrtA === 0n || sqrtB <= sqrtA) return 0n;
  return mulDiv(liquidity << 96n, sqrtB - sqrtA, sqrtB * sqrtA);
}

function amount1For(sqrtA: bigint, sqrtB: bigint, liquidity: bigint): bigint {
  if (sqrtB <= sqrtA) return 0n;
  return mulDiv(liquidity, sqrtB - sqrtA, Q96n);
}

/**
 * `PositionInfo` is packed: 200 bits of truncated pool id, then tickUpper,
 * tickLower, and a subscriber flag in the low byte. Ticks are int24, so they
 * need sign extension — an unsigned read makes every negative lower tick come
 * back as ~16.7 million, which silently draws the wrong range.
 */
export function decodePositionInfo(info: bigint): { tickLower: number; tickUpper: number } {
  const mask = (1n << 24n) - 1n;
  return {
    tickLower: Number(BigInt.asIntN(24, (info >> 8n) & mask)),
    tickUpper: Number(BigInt.asIntN(24, (info >> 32n) & mask)),
  };
}

/** `BalanceDelta` is two int128s packed into an int256: amount0 high, amount1 low. */
export function unpackBalanceDelta(delta: bigint): { amount0: bigint; amount1: bigint } {
  const asUint = BigInt.asUintN(256, delta);
  return {
    amount0: BigInt.asIntN(128, asUint >> 128n),
    amount1: BigInt.asIntN(128, asUint & ((1n << 128n) - 1n)),
  };
}
