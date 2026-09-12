/**
 * The write-side counterpart to `clients.ts`. `clients.ts` stays read-only
 * and server-renderable on purpose (PHASES.md Phase 1); this config is for
 * the client-only write surface added in Phase 4 and is never imported from
 * a server component.
 */

import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet, unichainSepolia } from "./chains";

/**
 * `injected()` is the only connector — it talks to whatever EOA browser
 * extension the user already has (MetaMask, Rabby, Brave Wallet, ...) via
 * EIP-1193. No email/social login, no embedded wallet, no smart-contract
 * wallet.
 */
export const wagmiConfig = createConfig({
  chains: [arcTestnet, unichainSepolia],
  connectors: [injected()],
  ssr: true,
  transports: {
    [arcTestnet.id]: http(),
    [unichainSepolia.id]: http(),
  },
});
