/**
 * The write-side counterpart to `clients.ts`. `clients.ts` stays read-only
 * and server-renderable on purpose (PHASES.md Phase 1); this config is for
 * the client-only write surface added in Phase 4 and is never imported from
 * a server component.
 */

import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { arcTestnet, unichainSepolia } from "./chains";

export const wagmiConfig = createConfig({
  chains: [arcTestnet, unichainSepolia],
  transports: {
    [arcTestnet.id]: http(),
    [unichainSepolia.id]: http(),
  },
});
