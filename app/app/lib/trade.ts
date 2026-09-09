/**
 * USDC in, at a $-per-token price, to a whole-token estimate. Rounds down —
 * an estimate should never promise more than a real fill would give.
 */
export function estimateTokens(usdcAmount: number, price: number): number {
  if (!Number.isFinite(usdcAmount) || !Number.isFinite(price) || price <= 0) return 0;
  return Math.floor(usdcAmount / price);
}
