"use client";

import { encodeAbiParameters, encodePacked, parseAbiItem, type Address, type Hex } from "viem";
import { readContract } from "wagmi/actions";
import { positionManagerAbi } from "./abis";
import { MEASURED_POOL_ID, MEASURED_POOL_KEY, POSITION_MANAGER } from "./addresses";
import { unichainClient } from "./clients";
import { decodePositionInfo, poolId, type PoolKey } from "./v4";
import { wagmiConfig } from "./wagmi";
import { UNICHAIN } from "./writes";

/**
 * Uniswap v4 PositionManager, from the browser.
 *
 * Two things here are not obvious:
 *
 *  1. **Calls are a command tape, not a method.** `modifyLiquidities` takes an
 *     `abi.encode(actions, params)` pair — actions are packed bytes, params is
 *     one blob per action — so minting is MINT_POSITION followed by
 *     SETTLE_PAIR, which is what actually pays the pool.
 *  2. **There is no enumeration.** v4 positions are ERC-721s with no
 *     `tokenOfOwnerByIndex`, so a holder's tokens come from scanning
 *     `Transfer(to = holder)` logs. Fine at testnet volume; a real deployment
 *     would read an indexer instead.
 */

const MINT_POSITION = 0x02;
const DECREASE_LIQUIDITY = 0x01;
const BURN_POSITION = 0x03;
const SETTLE_PAIR = 0x0d;
const TAKE_PAIR = 0x11;

const POOL_KEY_PARAM = {
  name: "poolKey",
  type: "tuple",
  components: [
    { name: "currency0", type: "address" },
    { name: "currency1", type: "address" },
    { name: "fee", type: "uint24" },
    { name: "tickSpacing", type: "int24" },
    { name: "hooks", type: "address" },
  ],
} as const;

/** `abi.encode(actions, params)` — the shape `modifyLiquidities` unlocks with. */
function unlockData(actions: Hex, params: Hex[]): Hex {
  return encodeAbiParameters(
    [
      { name: "actions", type: "bytes" },
      { name: "params", type: "bytes[]" },
    ],
    [actions, params],
  );
}

export function encodeMint(args: {
  key: PoolKey;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  amount0Max: bigint;
  amount1Max: bigint;
  owner: Address;
}): Hex {
  const { key, tickLower, tickUpper, liquidity, amount0Max, amount1Max, owner } = args;

  const mint = encodeAbiParameters(
    [
      POOL_KEY_PARAM,
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "liquidity", type: "uint256" },
      { name: "amount0Max", type: "uint128" },
      { name: "amount1Max", type: "uint128" },
      { name: "owner", type: "address" },
      { name: "hookData", type: "bytes" },
    ],
    [key, tickLower, tickUpper, liquidity, amount0Max, amount1Max, owner, "0x"],
  );

  // SETTLE_PAIR is what pays for the mint; without it the unlock reverts owing.
  const settle = encodeAbiParameters(
    [
      { name: "currency0", type: "address" },
      { name: "currency1", type: "address" },
    ],
    [key.currency0, key.currency1],
  );

  return unlockData(encodePacked(["uint8", "uint8"], [MINT_POSITION, SETTLE_PAIR]), [mint, settle]);
}

/** Pull all liquidity out, burn the NFT, and take both tokens back. */
export function encodeClose(args: { key: PoolKey; tokenId: bigint; liquidity: bigint; recipient: Address }): Hex {
  const { key, tokenId, liquidity, recipient } = args;

  const decrease = encodeAbiParameters(
    [
      { name: "tokenId", type: "uint256" },
      { name: "liquidity", type: "uint256" },
      { name: "amount0Min", type: "uint128" },
      { name: "amount1Min", type: "uint128" },
      { name: "hookData", type: "bytes" },
    ],
    [tokenId, liquidity, 0n, 0n, "0x"],
  );

  const burn = encodeAbiParameters(
    [
      { name: "tokenId", type: "uint256" },
      { name: "amount0Min", type: "uint128" },
      { name: "amount1Min", type: "uint128" },
      { name: "hookData", type: "bytes" },
    ],
    [tokenId, 0n, 0n, "0x"],
  );

  const take = encodeAbiParameters(
    [
      { name: "currency0", type: "address" },
      { name: "currency1", type: "address" },
      { name: "recipient", type: "address" },
    ],
    [key.currency0, key.currency1, recipient],
  );

  return unlockData(
    encodePacked(["uint8", "uint8", "uint8"], [DECREASE_LIQUIDITY, BURN_POSITION, TAKE_PAIR]),
    [decrease, burn, take],
  );
}

export type OwnedPosition = {
  tokenId: bigint;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
};

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed id)",
);

/**
 * `sepolia.unichain.org` rejects any `eth_getLogs` spanning more than 10,000
 * blocks, so a single `fromBlock: "earliest"` scan (block 0 to a chain now
 * tens of millions of blocks tall) always fails outright — not a rate-limit
 * fluke, every call. Scanning the *entire* history back to genesis in
 * 10k-block pages would take thousands of round trips, so this bounds the
 * lookback instead: recent testnet activity only, same trade-off
 * `live-market.ts` makes for the same RPC limit. A position minted further
 * back than this window will not show up.
 */
const LOG_CHUNK = 9_500n;
const MAX_CHUNKS = 20;

async function scanRecentTransfersTo(address: Address, owner: Address) {
  const latest = await unichainClient.getBlockNumber();
  const all: Awaited<ReturnType<typeof unichainClient.getLogs<typeof TRANSFER_EVENT>>> = [];

  let to = latest;
  for (let i = 0; i < MAX_CHUNKS && to > 0n; i++) {
    const from = to > LOG_CHUNK ? to - LOG_CHUNK : 0n;
    const logs = await unichainClient.getLogs({
      address,
      event: TRANSFER_EVENT,
      args: { to: owner },
      fromBlock: from,
      toBlock: to,
    });
    all.push(...logs);
    if (from === 0n) break;
    to = from - 1n;
  }

  return all;
}

/**
 * Positions in the measured pool held by `owner`.
 *
 * Scans `Transfer(to = owner)` and keeps the ids that still belong to them and
 * still have liquidity — a token can have been transferred on, or closed, and
 * either way the log that minted it is still in the chain's history.
 */
export async function readOwnedPositions(owner: Address): Promise<OwnedPosition[]> {
  const logs = await scanRecentTransfersTo(POSITION_MANAGER, owner);

  const ids = [...new Set(logs.map((l) => l.args.id).filter((id): id is bigint => id !== undefined))];
  const measured = poolId(MEASURED_POOL_KEY);
  const found: OwnedPosition[] = [];

  for (const tokenId of ids) {
    try {
      const [currentOwner, liquidity, poolAndInfo] = await Promise.all([
        readContract(wagmiConfig, {
          address: POSITION_MANAGER,
          abi: positionManagerAbi,
          functionName: "ownerOf",
          args: [tokenId],
          chainId: UNICHAIN,
        }),
        readContract(wagmiConfig, {
          address: POSITION_MANAGER,
          abi: positionManagerAbi,
          functionName: "getPositionLiquidity",
          args: [tokenId],
          chainId: UNICHAIN,
        }),
        readContract(wagmiConfig, {
          address: POSITION_MANAGER,
          abi: positionManagerAbi,
          functionName: "getPoolAndPositionInfo",
          args: [tokenId],
          chainId: UNICHAIN,
        }),
      ]);

      if (currentOwner.toLowerCase() !== owner.toLowerCase()) continue;
      if (liquidity === 0n) continue;
      if (poolId(poolAndInfo[0]) !== measured) continue;

      found.push({ tokenId, liquidity, ...decodePositionInfo(poolAndInfo[1]) });
    } catch {
      // A burned token reverts on ownerOf. Not an error — just gone.
    }
  }

  return found;
}

export { MEASURED_POOL_ID };
