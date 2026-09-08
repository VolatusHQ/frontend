"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useSwitchChain } from "wagmi";
import { arcTestnet } from "@/app/app/lib/onchain/chains";
import { PRIVY_APP_ID } from "@/app/app/lib/onchain/privy-config";
import { addr } from "@/app/app/lib/format";

const BUTTON_CLASS =
  "px-s3 py-s2 text-t3 font-medium border border-hair-lit text-bone hover:bg-panel-2 transition-colors duration-[140ms] disabled:opacity-40 disabled:cursor-not-allowed";

/** Rendered when `NEXT_PUBLIC_PRIVY_APP_ID` isn't set — see providers.tsx. */
function Unconfigured() {
  return (
    <button type="button" disabled className={BUTTON_CLASS} title="NEXT_PUBLIC_PRIVY_APP_ID is not set">
      Connect wallet
    </button>
  );
}

/**
 * Sign-in + external-wallet connect in one control, via Privy — the surface
 * README.md names for this and the only one that gets both cases the user
 * asked for (email/social login with an embedded wallet, or an existing
 * wallet like MetaMask) without two separate buttons.
 *
 * The Live actions panel on `/app/markets` is the only place a connected
 * wallet is used to sign anything (WIRING.md § Redeploy scope); everywhere
 * else in the app stays exactly as mock as it was.
 */
function Connected() {
  const { authenticated, ready, login, logout, user } = usePrivy();
  const { address, chain } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (!ready) {
    return (
      <button type="button" disabled className={BUTTON_CLASS}>
        Loading…
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button type="button" onClick={login} className={BUTTON_CLASS}>
        Connect wallet
      </button>
    );
  }

  const label = address ? addr(address) : (user?.email?.address ?? "Connected");
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
      <button type="button" onClick={logout} className={`${BUTTON_CLASS} num`}>
        {label}
      </button>
    </div>
  );
}

export function ConnectWalletButton() {
  return PRIVY_APP_ID ? <Connected /> : <Unconfigured />;
}
