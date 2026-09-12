"use client";

import { erc20Abi, parseUnits } from "viem";
import { useAccount, useReadContract, useSwitchChain } from "wagmi";
import { writeContract } from "wagmi/actions";
import { PageHead } from "../components/volatus/AppShell";
import { Block, Stat } from "../components/volatus/Stat";
import { dec, int } from "../lib/format";
import {
  MOCK_USDC,
  MOCK_WETH,
  SIGMA_HOOK,
  SIGMA_ORACLE,
  SIGMA_VAULT,
  USDC_DECIMALS,
  VARIANCE_TOKEN_IMPL,
  WETH_DECIMALS,
} from "../lib/onchain/addresses";
import { mintableErc20Abi } from "../lib/onchain/abis";
import { unichainSepolia } from "../lib/onchain/chains";
import { UNICHAIN, waitFor } from "../lib/onchain/writes";
import { txMessage, useTx } from "../lib/onchain/useTx";
import { wagmiConfig } from "../lib/onchain/wagmi";

/**
 * Self-serve mock tokens for testing — mWETH and mUSDC, the only two this
 * protocol ever measures or holds as collateral (see MarketOverview.tsx's
 * note: they're mock-priced 1:1, worth nothing, and exist so variance has
 * something to be measured in). `MintableERC20.mint` is an open faucet —
 * anyone can call it for anyone — so this page just calls it from the
 * connected wallet directly, no backend key involved.
 *
 * Same mint call `LiquidityPanel.tsx` already makes (that component isn't
 * wired into any route today); kept here as its own small, discoverable
 * page rather than bundled with deposit/position logic.
 */

const PRIMARY =
  "bg-pink text-ink px-s4 py-s3 text-t3 text-center font-medium hover:opacity-90 transition-opacity duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed";

const USDC_AMOUNT = parseUnits("10000", USDC_DECIMALS);
const WETH_AMOUNT = parseUnits("10", WETH_DECIMALS);

const CORE_ADDRESSES = [
  { label: "VolatusOracle", value: SIGMA_ORACLE },
  { label: "VolatusHook", value: SIGMA_HOOK },
  { label: "VolatusVault", value: SIGMA_VAULT },
  { label: "VarianceToken implementation", value: VARIANCE_TOKEN_IMPL, note: "cloned per epoch leg" },
] as const;

const MOCK_ADDRESSES = [
  { label: "mWETH (MOCK_WETH)", value: MOCK_WETH },
  { label: "mUSDC (MOCK_USDC)", value: MOCK_USDC },
] as const;

function AddressRow({ label, value, note }: { label: string; value: `0x${string}`; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-s4 gap-y-[2px] py-s2 border-t border-hair-2 first:border-t-0">
      <span className="text-t3 text-bone-2">
        {label}
        {note ? <span className="text-t2 text-bone-3"> — {note}</span> : null}
      </span>
      <a
        href={`https://sepolia.uniscan.xyz/address/${value}`}
        target="_blank"
        rel="noreferrer"
        className="num text-t3 text-bone hover:text-pink underline decoration-hair-lit underline-offset-4 transition-colors duration-[140ms]"
      >
        {value}
      </a>
    </div>
  );
}

export default function FaucetPage() {
  const { address, chain } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { state, run, busy } = useTx();
  const status = txMessage(state);

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

  const wrongChain = Boolean(address) && chain !== undefined && chain.id !== unichainSepolia.id;

  async function mint(token: typeof MOCK_USDC | typeof MOCK_WETH, amount: bigint, label: string) {
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
      usdcBalance.refetch();
      wethBalance.refetch();
    });
  }

  return (
    <div className="px-s5 py-s6 max-w-[820px] mx-auto w-full flex flex-col gap-s6">
      <PageHead
        title="Faucet"
        lede="Free mWETH and mUSDC on Unichain Sepolia — the only tokens this protocol measures or holds as collateral. Testnet only, worth nothing."
      />

      {!address ? (
        <p className="text-t3 text-bone-2 m-0">Connect a wallet (top right) to receive tokens.</p>
      ) : (
        <Block title="Mint" aside="MintableERC20 · open faucet" plate>
          <div className="flex flex-col gap-s4">
            <div className="flex flex-wrap gap-x-s6 gap-y-s4">
              <Stat
                layout="value-first"
                size="lg"
                label="Your mUSDC"
                value={int(Number(usdcBalance.data ?? 0n) / 10 ** USDC_DECIMALS)}
              />
              <Stat
                layout="value-first"
                size="lg"
                label="Your mWETH"
                value={dec(Number(wethBalance.data ?? 0n) / 10 ** WETH_DECIMALS, 4)}
              />
            </div>

            {wrongChain ? (
              <button
                type="button"
                onClick={() => switchChain({ chainId: unichainSepolia.id })}
                disabled={switching}
                className={PRIMARY}
              >
                {switching ? "Switching…" : "Switch to Unichain Sepolia"}
              </button>
            ) : (
              <div className="flex flex-wrap gap-s3">
                <button
                  type="button"
                  onClick={() => mint(MOCK_USDC, USDC_AMOUNT, "10,000 mUSDC")}
                  disabled={busy}
                  className={PRIMARY}
                >
                  Get 10,000 mUSDC
                </button>
                <button
                  type="button"
                  onClick={() => mint(MOCK_WETH, WETH_AMOUNT, "10 mWETH")}
                  disabled={busy}
                  className={PRIMARY}
                >
                  Get 10 mWETH
                </button>
              </div>
            )}

            {status ? (
              <p className={`text-t2 m-0 ${status.tone === "bad" ? "text-down" : "text-bone-2"}`}>
                {status.text}
              </p>
            ) : null}
          </div>
        </Block>
      )}

      <Block title="Contract addresses" aside="Unichain Sepolia · chain 1301">
        <div className="flex flex-col gap-s4">
          <div>
            <span className="lbl">Core protocol</span>
            <div className="flex flex-col">
              {CORE_ADDRESSES.map((a) => (
                <AddressRow key={a.value} {...a} />
              ))}
            </div>
          </div>
          <div>
            <span className="lbl">Mock test tokens — open faucet, anyone can mint</span>
            <div className="flex flex-col">
              {MOCK_ADDRESSES.map((a) => (
                <AddressRow key={a.value} {...a} />
              ))}
            </div>
          </div>
        </div>
      </Block>

      <div className="flex flex-col gap-s2 text-t2 text-bone-3">
        <p className="m-0 max-w-[60ch]">
          Need Arc-side USDC too (for subscribing to coverage or posting underwriter capacity)?
          That&apos;s Circle&apos;s real testnet USDC, not ours to mint —{" "}
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noreferrer"
            className="text-bone-2 hover:text-bone underline decoration-hair-lit underline-offset-4"
          >
            faucet.circle.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
