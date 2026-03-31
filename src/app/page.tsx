"use client";

import React from "react";
import { WalletProvider } from "@/context/WalletProvider";
import { NetworkBadge } from "@/components/NetworkBadge";
import { Dashboard } from "@/components/Dashboard";

export default function HomePage() {
  return (
    <WalletProvider>
      <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="mb-10">
          <div className="flex items-center justify-between">
            {/* Logo / Brand */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center">
                {/* Animated glow ring */}
                <span className="absolute inset-0 animate-glow rounded-xl bg-gradient-to-br from-stellar-500/20 to-nebula-500/20" />
                <svg
                  className="relative h-6 w-6 text-stellar-300"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Stellar <span className="text-stellar-400">dApp</span>
                </h1>
                <p className="text-xs text-stellar-400/50">
                  Decentralized on Stellar
                </p>
              </div>
            </div>

            {/* Network badge */}
            <NetworkBadge />
          </div>
        </header>

        {/* ── Hero Section ────────────────────────────────────────────── */}
        <section className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Connect, Explore,{" "}
            <span className="bg-gradient-to-r from-stellar-400 to-nebula-400 bg-clip-text text-transparent">
              Transact
            </span>
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-stellar-300/60">
            Connect your Freighter wallet to view your XLM balance and send
            test transactions on the Stellar testnet — all in a sleek,
            decentralized interface.
          </p>
        </section>



        {/* ── Dashboard (PIN & History & Panel) ────────────────────────── */}
        <section className="mb-8">
          <Dashboard />
        </section>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="mt-auto pt-10">
          <div className="flex flex-col items-center gap-2 border-t border-stellar-800/30 pt-6">
            <p className="text-xs text-stellar-500/40">
              Built on{" "}
              <a
                href="https://stellar.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted transition-colors hover:text-stellar-400/60"
              >
                Stellar
              </a>{" "}
              · Powered by{" "}
              <a
                href="https://freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted transition-colors hover:text-stellar-400/60"
              >
                Freighter
              </a>
            </p>
            <p className="text-[10px] text-stellar-600/30">
              Testnet only — do not send real assets
            </p>
          </div>
        </footer>
      </main>
    </WalletProvider>
  );
}
