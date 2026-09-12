"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "@/app/app/lib/onchain/chains";
import { addr } from "@/app/app/lib/format";

const BUTTON_CLASS =
  "px-s3 py-s2 text-t3 font-medium border border-hair-lit text-bone hover:bg-panel-2 transition-colors duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed";

/**
 * Plain wagmi wallet connect, via `injected()` — whatever EOA browser
 * extension the user already has (MetaMask, Rabby, Brave Wallet, ...). No
 * email/social login, and no embedded or smart-contract wallet.
 *
 * The Live actions panel on `/app/markets` is the only place a connected
 * wallet is used to sign anything (WIRING.md § Redeploy scope); everywhere
 * else in the app stays exactly as mock as it was.
 */
export function ConnectWalletButton() {
  const { address, chain, status } = useAccount();
  const { connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (status === "connecting" || status === "reconnecting") {
    return (
      <button type="button" disabled className={BUTTON_CLASS}>
        Loading…
      </button>
    );
  }

  if (status !== "connected") {
    return (
      <button
        type="button"
        onClick={() => connect({ connector: injected() })}
        disabled={connecting}
        className={BUTTON_CLASS}
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  const wrongChain = chain !== undefined && chain.id !== arcTestnet.id;

  return (
    <div className="flex items-center gap-s2">
      {wrongChain ? (
        <button
          type="button"
          onClick={() => switchChain({ chainId: arcTestnet.id })}
          disabled={switching}
          className={BUTTON_CLASS}
          title="The Live actions panel signs against Arc Testnet"
        >
          {switching ? "Switching…" : "Switch to Arc"}
        </button>
      ) : null}
      <button type="button" onClick={() => disconnect()} className={`${BUTTON_CLASS} num`}>
        {address ? addr(address) : "Connected"}
      </button>
    </div>
  );
}
