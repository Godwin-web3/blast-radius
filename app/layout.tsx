import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: {
    default: "Blast Radius",
    template: "%s · Blast Radius",
  },
  description:
    "Paste a wallet. See which ERC-20 approvals can still move your tokens on Ethereum, Base, and Arbitrum. Read-only.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${barlow.variable} ${plex.variable} ${instrument.variable} ${barlow.className}`}>
        <div className="noise" />
        {children}
      </body>
    </html>
  );
}
