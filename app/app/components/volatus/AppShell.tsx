"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/app/lib/utils";
import { ConnectWalletButton } from "./ConnectWalletButton";

const TABS = [
  { href: "/app/markets", label: "Markets" },
  { href: "/app/liquidity", label: "Liquidity" },
  { href: "/app/underwrite", label: "Underwrite" },
  { href: "/app/profile", label: "Profile" },
];

/** Markets and Underwrite read real chain state (`live-market.ts`); Liquidity
 *  and Profile are still local mock data (`liquidity-data.ts`, `portfolio.ts`'s
 *  LP/trading inputs). The footer below names which one the current route is,
 *  rather than one blanket claim that is now wrong for half the app. */
const LIVE_SECTIONS = ["/app/markets", "/app/underwrite"];

function TabLinks({ isActive }: { isActive: (href: string) => boolean }) {
  return (
    <>
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={isActive(t.href) ? "page" : undefined}
          className={cn(
            "px-s3 py-s2 text-t3 font-medium no-underline border-b-2 whitespace-nowrap transition-colors duration-[140ms]",
            isActive(t.href)
              ? "text-bone border-pink"
              : "text-bone-2 border-transparent hover:text-bone",
          )}
        >
          {t.label}
        </Link>
      ))}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  // None of the four tab hrefs prefixes another, so a drill-down route like
  // /app/markets/eth-usdc highlights "Markets" for free — no special-casing
  // needed (unlike the old IA, where /app/pool needed a carve-out onto the
  // /app "Index" tab).
  const isActive = (href: string) => path.startsWith(href);
  const isLive = LIVE_SECTIONS.some((href) => path.startsWith(href));

  return (
    <>
      <header className="border-b border-hair">
        <div className="flex items-center gap-s4 px-s5 py-s3">
          <Link href="/" aria-label="Volatus" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/wordmark.webp" alt="Volatus" className="h-6 w-auto block" />
          </Link>

          <nav aria-label="Sections" className="hidden md:flex gap-s1 ml-s4">
            <TabLinks isActive={isActive} />
          </nav>

          <div className="ml-auto shrink-0">
            <ConnectWalletButton />
          </div>
        </div>

        <nav
          aria-label="Sections"
          className="md:hidden flex gap-s1 px-s5 overflow-x-auto border-t border-hair-2"
        >
          <TabLinks isActive={isActive} />
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-hair px-s5 py-s4 text-t2 text-bone-3">
        {isLive
          ? "Testnet. This page reads live chain state on Unichain Sepolia + Arc Testnet, not mock data."
          : "Testnet. This page is local mock data, not a live market — Markets and Underwrite are live."}
      </footer>
    </>
  );
}

/** The path back. Every segment is a link. §15.5 */
export function Breadcrumb({ trail }: { trail: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-s4">
      <ol className="flex flex-wrap items-center gap-s2 list-none p-0 m-0 text-t2 font-mono">
        {trail.map((t, i) => (
          <li key={t.label} className="flex items-center gap-s2">
            {t.href ? (
              <Link
                href={t.href}
                className="text-bone-3 no-underline hover:text-bone transition-colors duration-[140ms]"
              >
                {t.label}
              </Link>
            ) : (
              <span className="text-bone-2" aria-current="page">
                {t.label}
              </span>
            )}
            {i < trail.length - 1 ? (
              <span aria-hidden="true" className="text-bone-3 opacity-40">
                /
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Page head: an eyebrow, a title, and at most one line of explanation. */
export function PageHead({
  eyebrow,
  title,
  lede,
  aside,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  aside?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-s4">
      <div className="flex flex-col gap-s2 max-w-[60ch]">
        {eyebrow ? <span className="lbl">{eyebrow}</span> : null}
        <h1 className="font-serif text-d3 font-medium leading-[1.12] tracking-[-0.012em] m-0 text-balance">
          {title}
        </h1>
        {lede ? <p className="text-t4 text-bone-2 m-0">{lede}</p> : null}
      </div>
      {aside}
    </header>
  );
}
