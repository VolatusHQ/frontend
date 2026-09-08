/**
 * Minimal ABIs — only the functions and events the app actually reads.
 *
 * Hand-narrowed rather than generated, on purpose: the full artifacts are
 * large, and a short list makes it obvious what surface the frontend depends
 * on. Regenerate the source of truth with `forge build` in `contracts/` and
 * read `out/<Name>.sol/<Name>.json`.
 *
 * `as const` is load-bearing — viem infers argument and return types from it.
 */

export const sigmaOracleAbi = [
  {
    type: "function",
    name: "tryImpliedVol",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "ok", type: "bool" },
      { name: "impliedVolWad", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "realizedVol",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "realizedVariance",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "normalizedImpliedVariance",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "epoch",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "endBlock", type: "uint64" },
      { name: "strike", type: "uint256" },
      { name: "cap", type: "uint256" },
    ],
  },
] as const;

export const sigmaHookAbi = [
  {
    type: "function",
    name: "varianceState",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "accumulator", type: "uint256" },
          { name: "lastTick", type: "int24" },
          { name: "lastBlock", type: "uint48" },
          { name: "observations", type: "uint32" },
          { name: "pendingSnapshot", type: "uint48" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "VarianceObserved",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "tick", type: "int24", indexed: false },
      { name: "accumulator", type: "uint256", indexed: false },
      { name: "observations", type: "uint32", indexed: false },
    ],
  },
] as const;

export const sigmaVaultAbi = [
  {
    type: "function",
    name: "activeEpoch",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "epoch",
    stateMutability: "view",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "poolId", type: "bytes32" },
          { name: "startBlock", type: "uint48" },
          { name: "endBlock", type: "uint48" },
          { name: "horizonSeconds", type: "uint32" },
          { name: "settled", type: "bool" },
          { name: "startAccumulator", type: "uint256" },
          { name: "strikeWad", type: "uint256" },
          { name: "capWad", type: "uint256" },
          { name: "longToken", type: "address" },
          { name: "shortToken", type: "address" },
          { name: "collateralHeld", type: "uint256" },
          { name: "payoffWad", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "realizedVariance",
    stateMutability: "view",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "epochCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  /* Writes. All permissionless — `settle` and `openEpoch` included, which is
     what lets a dead epoch be rolled without anyone's key. */
  {
    type: "function",
    name: "mintPair",
    stateMutability: "nonpayable",
    inputs: [
      { name: "epochId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "burnPair",
    stateMutability: "nonpayable",
    inputs: [
      { name: "epochId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [
      { name: "epochId", type: "uint256" },
      { name: "isLong", type: "bool" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "payout", type: "uint256" }],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "EpochSettled",
    inputs: [
      { name: "epochId", type: "uint256", indexed: true },
      { name: "realizedVariance", type: "uint256", indexed: false },
      { name: "payoff", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * Where implied volatility is discovered: the VAR-LONG/mUSDC pool registered
 * against an epoch. `longIsCurrency0` decides which direction of a swap buys
 * VAR-LONG, so it is read rather than assumed.
 */
export const sigmaOracleVolPoolAbi = [
  {
    type: "function",
    name: "volPool",
    stateMutability: "view",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "poolId", type: "bytes32" },
          { name: "longIsCurrency0", type: "bool" },
          { name: "registered", type: "bool" },
        ],
      },
    ],
  },
] as const;

/** Uniswap v4 pool state. The PoolManager keeps state in transient-ish storage
 *  slots; StateView is the read wrapper periphery ships for exactly this. */
export const stateViewAbi = [
  {
    type: "function",
    name: "getSlot0",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
    ],
  },
  {
    type: "function",
    name: "getLiquidity",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ type: "uint128" }],
  },
  {
    type: "function",
    name: "getPositionInfo",
    stateMutability: "view",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "positionId", type: "bytes32" },
    ],
    outputs: [
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
    ],
  },
] as const;

/**
 * `PoolSwapTest` from v4-core. This is how the vol pool is traded, and trading
 * it is what moves implied volatility — the whole point of the protocol.
 */
export const poolSwapTestAbi = [
  {
    type: "function",
    name: "swap",
    stateMutability: "payable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "zeroForOne", type: "bool" },
          { name: "amountSpecified", type: "int256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
      {
        name: "testSettings",
        type: "tuple",
        components: [
          { name: "takeClaims", type: "bool" },
          { name: "settleUsingBurn", type: "bool" },
        ],
      },
      { name: "hookData", type: "bytes" },
    ],
    // BalanceDelta is a packed int256: amount0 in the high 128, amount1 in the low.
    outputs: [{ name: "delta", type: "int256" }],
  },
] as const;

/** The mock tokens' open faucet. Testnet only, by design — see MintableERC20. */
export const mintableErc20Abi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

/**
 * Uniswap v4 PositionManager. Positions are ERC-721s, but v4 ships no
 * enumeration, so a holder's tokens come from a `Transfer(to = holder)` log
 * scan rather than a `tokenOfOwnerByIndex` call that does not exist.
 */
export const positionManagerAbi = [
  {
    type: "function",
    name: "modifyLiquidities",
    stateMutability: "payable",
    inputs: [
      { name: "unlockData", type: "bytes" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "nextTokenId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getPositionLiquidity",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "liquidity", type: "uint128" }],
  },
  {
    type: "function",
    name: "getPoolAndPositionInfo",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "poolKey",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      // PositionInfo is a packed uint256: tickLower/tickUpper live in it.
      { name: "info", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "id", type: "uint256", indexed: true },
    ],
  },
] as const;

/** Permit2's allowance path — what PositionManager pulls tokens through. */
export const permit2Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
] as const;

export const sigmaStreamAbi = [
  {
    type: "function",
    name: "capacityPool",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  /**
   * Write functions live on the deployed contract today.
   *
   * `adjust` is here as of the 2026-09-05 redeploy — selector `0x6f871cec`,
   * confirmed present in the bytecode at `SIGMA_STREAM`. The previous contract
   * did not have it, which is why this entry was absent before: calling a
   * function missing from the live bytecode reverts, and a revert is a worse
   * failure mode than not offering the button.
   */
  {
    type: "function",
    name: "adjust",
    stateMutability: "nonpayable",
    inputs: [
      { name: "epochId", type: "uint256" },
      { name: "newRatePerSecond", type: "uint256" },
      { name: "newCoverageNotional", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "postCapacity",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    type: "function",
    name: "withdrawCapacity",
    stateMutability: "nonpayable",
    inputs: [{ name: "shareAmount", type: "uint256" }],
    outputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "function",
    name: "subscribe",
    stateMutability: "nonpayable",
    inputs: [
      { name: "epochId", type: "uint256" },
      { name: "ratePerSecond", type: "uint256" },
      { name: "coverageNotional", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "fund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "epochId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [{ name: "refund", type: "uint256" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [{ name: "payout", type: "uint256" }],
  },
  {
    type: "function",
    name: "reclaimUnreported",
    stateMutability: "nonpayable",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [{ name: "refund", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalShares",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "shares",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "settlementReporter",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "runwaySeconds",
    stateMutability: "view",
    inputs: [
      { name: "epochId", type: "uint256" },
      { name: "subscriber", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "epoch",
    stateMutability: "view",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "coverageStart", type: "uint64" },
          { name: "coverageEnd", type: "uint64" },
          { name: "reportDeadline", type: "uint64" },
          { name: "reported", type: "bool" },
          { name: "payoffWad", type: "uint256" },
          { name: "totalCoverageSold", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "subscription",
    stateMutability: "view",
    inputs: [
      { name: "epochId", type: "uint256" },
      { name: "subscriber", type: "address" },
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "ratePerSecond", type: "uint256" },
          { name: "coverageNotional", type: "uint256" },
          { name: "funded", type: "uint256" },
          { name: "lastSync", type: "uint64" },
          { name: "coveredSeconds", type: "uint64" },
          { name: "claimed", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "Synced",
    inputs: [
      { name: "epochId", type: "uint256", indexed: true },
      { name: "subscriber", type: "address", indexed: true },
      { name: "coveredSeconds", type: "uint64", indexed: false },
      { name: "premiumPaid", type: "uint256", indexed: false },
    ],
  },
] as const;
