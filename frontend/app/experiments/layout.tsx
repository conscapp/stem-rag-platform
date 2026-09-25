import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
import "../play/fieldplay.css";
import "./experiments.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--fp-serif",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--fp-sans",
  display: "swap",
});

export default function ExperimentsLayout({ children }: { children: ReactNode }) {
  return <div className={`${fraunces.variable} ${outfit.variable} fp-font-scope`}>{children}</div>;
}
