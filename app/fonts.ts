import { Newsreader, Hanken_Grotesk, Martian_Mono } from "next/font/google";

// Display. A high-contrast editorial serif. The page is a printed sheet, so the
// headline is set like one. Optical sizing on: the hero wants the display cut,
// the sign-off wants the text cut. DESIGN.md 4.
export const display = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

// Interface and body. A grotesk with enough character to not read as a system
// fallback, quiet enough to stay out of the serif's way.
export const ui = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-hanken",
  display: "swap",
});

// Data. Every live number, every label, every address. Tabular by default.
export const mono = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-martian",
  display: "swap",
});
