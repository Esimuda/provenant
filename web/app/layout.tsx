import type { Metadata } from "next";
import localFont from "next/font/local";
import { ModeBanner } from "@/components/mode-banner";
import { RegistryProvider } from "@/components/registry-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WalletProvider } from "@/components/wallet";
import "./globals.css";

const display = localFont({
  src: [
    { path: "../public/fonts/InstrumentSerif-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/InstrumentSerif-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: false,
});

const text = localFont({
  src: "../public/fonts/InterTight-Variable.ttf",
  variable: "--font-text",
  display: "swap",
  weight: "400 700",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Provenant", template: "%s · Provenant" },
  description: "Turn the AI copyright war into a market. Register a work, prove it was in a training manifest, and collect the royalty on Portaldot.",
  openGraph: {
    title: "Provenant",
    description: "Get paid when models train on you.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${text.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <WalletProvider>
          <RegistryProvider>
            <SiteHeader />
            <ModeBanner />
            <main id="main" className="flex-1">{children}</main>
            <SiteFooter />
          </RegistryProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
