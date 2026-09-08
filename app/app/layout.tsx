import type { Metadata } from "next";
import "./app.css";
import { OnchainProviders } from "./lib/onchain/providers";
import { TooltipProvider } from "./components/ui/tooltip";
import { AppShell } from "./components/volatus/AppShell";

export const metadata: Metadata = {
  title: "Volatus — the volatility index",
  description:
    "Realized variance measured inside a Uniswap v4 pool, and the market where that volatility trades.",
};

/**
 * The application shell. DESIGN.md §15.
 *
 * `app.css` is imported here and nowhere else — the landing page at / is
 * styled entirely by globals.css and the two share no components.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnchainProviders>
      <TooltipProvider delayDuration={120}>
        <div className="vx">
          <AppShell>{children}</AppShell>
        </div>
      </TooltipProvider>
    </OnchainProviders>
  );
}
