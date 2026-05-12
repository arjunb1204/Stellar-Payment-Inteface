"use client";

import React from "react";
import { useWallet } from "@/hooks/useWallet";
import { STELLAR_MAINNET, STELLAR_TESTNET } from "@/lib/constants";

/**
 * Displays the active Stellar network with a pulsing status dot.
 * Clickable wrapper allows instant hot-swapping between networks.
 */
export function NetworkBadge() {
  const { activeNetwork, switchNetwork } = useWallet();
  const isMainnet = activeNetwork.name.includes("Mainnet");

  return (
    <button
      onClick={() => switchNetwork(isMainnet ? STELLAR_TESTNET : STELLAR_MAINNET)}
      id="network-badge"
      className={`group flex items-center gap-2 rounded-full border border-stellar-700/50 bg-cosmos-800/60 px-4 py-1.5 text-xs font-medium backdrop-blur-sm transition-all hover:bg-cosmos-700/80 ${isMainnet ? 'text-amber-300' : 'text-stellar-300'}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isMainnet ? 'bg-amber-400' : 'bg-emerald-400'}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${isMainnet ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      </span>
      {activeNetwork.name}
    </button>
  );
}
