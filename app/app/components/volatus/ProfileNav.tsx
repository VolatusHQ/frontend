"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/app/lib/utils";

const TABS = [
  { href: "/app/profile", label: "Overview", exact: true },
  { href: "/app/profile/trading", label: "Trading" },
  { href: "/app/profile/liquidity", label: "Liquidity" },
  { href: "/app/profile/underwriting", label: "Underwriting" },
  { href: "/app/profile/history", label: "History" },
];

/**
 * The Profile sub-navigation. Secondary to the app-shell tab strip — smaller
 * type, a thin underline for the active tab — with Settings held off to the
 * side as a ⚙ glyph rather than a nav item (§15.4: no icon set; a
 * typographic mark is fine).
 *
 * "Overview" matches only its exact path, since every other tab's href is a
 * sub-path of /app/profile.
 */
export function ProfileNav() {
  const path = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? path === href : path === href || path.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Portfolio views"
      className="flex items-stretch gap-s3 border-b border-hair"
    >
      <div className="flex items-center gap-s4 overflow-x-auto flex-1 min-w-0">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={isActive(t.href, t.exact) ? "page" : undefined}
            className={cn(
              "py-s3 text-t2 no-underline border-b-2 whitespace-nowrap transition-colors duration-[140ms]",
              isActive(t.href, t.exact)
                ? "text-bone border-bone"
                : "text-bone-3 border-transparent hover:text-bone",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Link
        href="/app/profile/settings"
        aria-label="Settings"
        aria-current={path.startsWith("/app/profile/settings") ? "page" : undefined}
        className={cn(
          "flex items-center pl-s3 text-t4 no-underline transition-colors duration-[140ms] shrink-0",
          path.startsWith("/app/profile/settings") ? "text-bone" : "text-bone-3 hover:text-bone",
        )}
      >
        {"⚙"}
      </Link>
    </nav>
  );
}
