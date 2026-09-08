/**
 * Shared between `providers.tsx` (whether to mount `PrivyProvider` at all)
 * and `ConnectWalletButton` (whether it's safe to call `usePrivy()` — that
 * hook throws outside a `PrivyProvider`, so the button must not render it
 * when no app id is configured).
 */
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
