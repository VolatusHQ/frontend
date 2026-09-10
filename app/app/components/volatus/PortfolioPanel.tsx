"use client";

import { useQuery } from "@tanstack/react-query";
import { erc20Abi, type Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { Block, Stat } from "./Stat";
import { addr, dec, int, usdc as fmtUsdc } from "@/app/app/lib/format";
import { duration, usdcToNumber } from "@/app/app/lib/onchain/units";
import {
  LIVE_EPOCH_ID,
  MOCK_USDC,
  MOCK_WETH,
  SIGMA_STREAM,
  USDC_DECIMALS,
  WETH_DECIMALS,
} from "@/app/app/lib/onchain/addresses";
import { sigmaStreamAbi } from "@/app/app/lib/onchain/abis";
import { arcTestnet } from "@/app/app/lib/onchain/chains";
import { readOwnedPositions } from "@/app/app/lib/onchain/positions";
import { UNICHAIN } from "@/app/app/lib/onchain/writes";
import type { LiveMarket } from "@/app/app/lib/onchain/reads";

/**
 * What this wallet actually holds, on both chains.
 *
 * There is no profit-and-loss figure and no history here, because neither
 * exists on chain: the protocol stores balances and positions, not a cost
 * basis. Inventing an entry price to subtract from would be the same class of
 * fiction as the pools this app used to draw.
 */
export function PortfolioPanel({ market }: { market: LiveMarket }) {
  const { address } = useAccount();
  const epoch = market.epoch;

  // A log scan, so it belongs in the query cache like every other read rather
  // than in an effect that refires on each render.
  const { data: positions, isPending: positionsPending } = useQuery({
    queryKey: ["positions", address],
    queryFn: () => readOwnedPositions(address!),
    enabled: Boolean(address),
  });

  const usdc = useToken(MOCK_USDC, address);
  const weth = useToken(MOCK_WETH, address);
  const long = useToken(epoch?.longToken, address);
  const short = useToken(epoch?.shortToken, address);

  const shares = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "shares",
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: Boolean(address) },
  });
  const subscription = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "subscription",
    args: address ? [LIVE_EPOCH_ID, address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: Boolean(address) },
  });
  const runway = useReadContract({
    address: SIGMA_STREAM,
    abi: sigmaStreamAbi,
    functionName: "runwaySeconds",
    args: address ? [LIVE_EPOCH_ID, address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: Boolean(address) },
  });

  if (!address) {
    return <p className="text-t3 text-bone-2 m-0">Connect a wallet to see what it holds.</p>;
  }

  const sub = subscription.data;
  const subscribed = sub !== undefined && sub.ratePerSecond !== 0n;
  const totalLiquidity = (positions ?? []).reduce((sum, p) => sum + p.liquidity, 0n);

  return (
    <div className="flex flex-col gap-s6">
      <span className="num text-t2 text-bone-3">{addr(address)}</span>

      <Block title="Unichain Sepolia" aside="chain 1301">
        <div className="flex flex-wrap gap-x-s6 gap-y-s4">
          <Stat
            layout="value-first"
            size="lg"
            label="mUSDC"
            value={fmtUsdc(Number(usdc) / 10 ** USDC_DECIMALS)}
          />
          <Stat
            layout="value-first"
            size="lg"
            label="mWETH"
            value={dec(Number(weth) / 10 ** WETH_DECIMALS, 4)}
          />
          <Stat
            layout="value-first"
            size="lg"
            label="VAR-LONG"
            ink="implied"
            value={epoch ? fmtUsdc(usdcToNumber(long)) : "—"}
          />
          <Stat
            layout="value-first"
            size="lg"
            label="VAR-SHORT"
            value={epoch ? fmtUsdc(usdcToNumber(short)) : "—"}
          />
        </div>
        {epoch ? (
          <p className="text-t2 text-bone-3 m-0 mt-s3">
            Legs are for epoch {epoch.id.toString()}
            {epoch.settled
              ? ` — settled at ${dec(Number(epoch.payoffWad) / 1e18, 4)}, redeemable on Trade.`
              : "."}
          </p>
        ) : null}
      </Block>

      <Block title="Liquidity positions" aside="Uniswap v4">
        {positionsPending ? (
          <p className="text-t3 text-bone-2 m-0">Looking…</p>
        ) : !positions || positions.length === 0 ? (
          <p className="text-t3 text-bone-2 m-0">None in the measured pool.</p>
        ) : (
          <div className="flex flex-wrap gap-x-s6 gap-y-s4">
            <Stat layout="value-first" label="Positions" value={int(positions.length)} />
            <Stat
              layout="value-first"
              label="Total liquidity"
              value={dec(Number(totalLiquidity) / 1e18, 4)}
            />
            <Stat
              layout="value-first"
              label="Token ids"
              value={positions.map((p) => `#${p.tokenId}`).join(" ")}
            />
          </div>
        )}
      </Block>

      <Block title="Arc Testnet" aside="chain 5042002">
        <div className="flex flex-wrap gap-x-s6 gap-y-s4">
          <Stat
            layout="value-first"
            size="lg"
            label="Underwriter shares"
            value={int(usdcToNumber(shares.data ?? 0n))}
          />
          {subscribed ? (
            <>
              <Stat
                layout="value-first"
                size="lg"
                label="Premium funded"
                value={`$${fmtUsdc(usdcToNumber(sub.funded))}`}
              />
              <Stat
                layout="value-first"
                label="Coverage notional"
                value={`$${fmtUsdc(usdcToNumber(sub.coverageNotional))}`}
              />
              <Stat
                layout="value-first"
                label="Runway"
                value={runway.data !== undefined ? duration(runway.data) : "—"}
              />
            </>
          ) : (
            <Stat layout="value-first" size="lg" label="Coverage" value="none" />
          )}
        </div>
      </Block>
    </div>
  );
}

function useToken(token: Address | undefined, owner: Address | undefined): bigint {
  const { data } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    chainId: UNICHAIN,
    query: { enabled: Boolean(token && owner) },
  });
  return data ?? 0n;
}
