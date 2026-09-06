import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Volatus",
  description: "Volatility protection for liquidity providers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
