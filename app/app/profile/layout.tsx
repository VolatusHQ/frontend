import type { Metadata } from "next";
import { AccountHeader } from "../components/volatus/AccountHeader";
import { ProfileNav } from "../components/volatus/ProfileNav";

export const metadata: Metadata = {
  title: "Portfolio — Volatus",
  description: "Your Volatus positions across trading, liquidity and underwriting.",
};

/**
 * The Profile shell: account identity + the sub-navigation, shared by every
 * portfolio view. Sub-pages render only their own sections. State is
 * preserved across sub-tab navigation (Next layout semantics).
 */
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-s5 py-s6 max-w-[1180px] mx-auto w-full flex flex-col gap-s6">
      <AccountHeader />
      <ProfileNav />
      <div className="flex flex-col gap-s6">{children}</div>
    </div>
  );
}
