import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellar dApp — Testnet Wallet & Transactions",
  description:
    "A production-ready decentralized application on the Stellar blockchain. Connect your Freighter wallet, view XLM balance, and send test transactions on the Stellar testnet.",
  keywords: [
    "Stellar",
    "dApp",
    "blockchain",
    "Freighter",
    "XLM",
    "testnet",
    "decentralized",
  ],
  authors: [{ name: "Stellar dApp" }],
  openGraph: {
    title: "Stellar dApp — Testnet Wallet & Transactions",
    description:
      "Connect your Freighter wallet, view your XLM balance, and send test transactions on the Stellar testnet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        {/* Deep space background */}
        <div className="stellar-bg" aria-hidden="true" />

        {children}
      </body>
    </html>
  );
}
