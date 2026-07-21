import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "conscRAG | The Consc Company",
  description:
    "Polymath innovation platform for aerospace, nanotechnology, and nuclear fusion — turn intuition into cross-STEM exploration.",
  metadataBase: new URL("https://conscrag.com"),
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "conscRAG | The Consc Company",
    description:
      "Turn intuition into innovation. Explore deep-tech ideas across aerospace, nanotechnology, and nuclear fusion.",
    siteName: "conscRAG",
    images: [{ url: "/logo.png", width: 312, height: 269, alt: "The Consc Company" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={barlow.variable}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
