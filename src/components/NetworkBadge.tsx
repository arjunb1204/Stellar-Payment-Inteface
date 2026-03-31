"use client";

import React from "react";
import { ACTIVE_NETWORK } from "@/lib/constants";

/**
 * Displays the active Stellar network with a pulsing status dot.
 */
export function NetworkBadge() {
  return (
    <div
      id="network-badge"
      className="flex items-center gap-2 rounded-full border border-stellar-700/50 bg-cosmos-800/60 px-4 py-1.5 text-xs font-medium text-stellar-300 backdrop-blur-sm"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {ACTIVE_NETWORK.name}
    </div>
  );
}
