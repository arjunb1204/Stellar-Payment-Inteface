"use client";

import React, { useState, useEffect } from "react";
import type { TransactionStatus } from "@/types";
import { getExplorerTxUrl, TX_TIMEOUT_SECONDS } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";

interface TransactionFeedbackProps {
  status: TransactionStatus;
  txHash: string | null;
  error: string | null;
  onReset: () => void;
  onClose?: () => void;
}

/** Status label + icon configurations */
const STATUS_CONFIG: Record<
  Exclude<TransactionStatus, "idle">,
  { label: string; color: string; icon: React.ReactNode }
> = {
  building: {
    label: "Building transaction...",
    color: "text-stellar-300",
    icon: (
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-stellar-400/30 border-t-stellar-400" />
    ),
  },
  signing: {
    label: "Waiting for signature...",
    color: "text-amber-300",
    icon: (
      <div className="h-5 w-5 animate-pulse">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </div>
    ),
  },
  submitting: {
    label: "Submitting to network...",
    color: "text-nebula-300",
    icon: (
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-nebula-400/30 border-t-nebula-400" />
    ),
  },
  success: {
    label: "Transaction successful!",
    color: "text-emerald-300",
    icon: (
      <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    label: "Transaction failed",
    color: "text-red-300",
    icon: (
      <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

/**
 * Dynamic transaction feedback component.
 *
 * Shows the current step in the transaction lifecycle with
 * appropriate icons, colors, and animations. On success, displays
 * a clickable explorer link to the transaction hash.
 */
export function TransactionFeedback({
  status,
  txHash,
  error,
  onReset,
  onClose,
}: TransactionFeedbackProps) {
  const { activeNetwork } = useWallet();
  const [timeLeft, setTimeLeft] = useState(TX_TIMEOUT_SECONDS);

  useEffect(() => {
    if (status === "signing") {
      setTimeLeft(TX_TIMEOUT_SECONDS);
      const interval = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  if (status === "idle") return null;

  const config = STATUS_CONFIG[status];

  // Determine border color based on status
  const borderColor =
    status === "success"
      ? "border-emerald-500/30"
      : status === "error"
      ? "border-red-500/30"
      : "border-stellar-600/30";

  const bgColor =
    status === "success"
      ? "bg-emerald-900/10"
      : status === "error"
      ? "bg-red-900/10"
      : "bg-cosmos-800/40";

  return (
    <div
      id="transaction-feedback"
      className={`mt-4 rounded-xl border ${borderColor} ${bgColor} p-4 backdrop-blur-sm transition-all duration-500`}
    >
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.icon}
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>

        {/* Timeout Timer */}
        {status === "signing" && (
          <div className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-1 font-mono text-xs text-amber-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {status === "error" && error && (
        <p className="mt-2 text-xs text-red-400/80">{error}</p>
      )}

      {/* Success: Transaction hash with explorer link */}
      {status === "success" && txHash && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stellar-400/60">TX Hash:</span>
            <code className="rounded bg-cosmos-800/60 px-2 py-0.5 font-mono text-xs text-stellar-200">
              {txHash.slice(0, 12)}...{txHash.slice(-12)}
            </code>
          </div>
          <a
            id="view-explorer-btn"
            href={getExplorerTxUrl(txHash, activeNetwork)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stellar-400 underline decoration-dotted transition-colors hover:text-stellar-200"
          >
            View on Stellar Expert
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      )}

      {/* Reset button for completed states */}
      {(status === "success" || status === "error") && (
        <div className="mt-3 flex gap-2">
          <button
            id="reset-transaction-btn"
            onClick={onReset}
            className="flex-1 rounded-lg border border-stellar-700/30 px-3 py-1.5 text-xs font-medium text-stellar-400 transition-all duration-300 hover:border-stellar-600/50 hover:text-stellar-300 bg-stellar-900/10"
          >
            {status === "success" ? "Send Another" : "Try Again"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 rounded-lg bg-gradient-to-r from-stellar-500 to-nebula-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-110 active:scale-95"
            >
              Return to Dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
}
