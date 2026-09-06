import type { Metadata, Viewport } from "next";
import { display, ui, mono } from "./fonts";
import { BRAND, TAGLINE } from "./lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND,
  description: TAGLINE,
  openGraph: {
    title: BRAND,
    description: TAGLINE,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0710",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
