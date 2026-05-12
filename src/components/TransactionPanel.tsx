"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTransaction } from "@/hooks/useTransaction";
import { TransactionFeedback } from "./TransactionFeedback";
import {
  DUMMY_DESTINATION,
  DEFAULT_SEND_AMOUNT,
} from "@/lib/constants";
import { truncateAddress, fundTestnetAccount } from "@/lib/stellar";

/**
 * Transaction panel component.
 *
 * Displays the connected wallet's XLM balance and provides
 * the interface to send a test transaction on Stellar testnet.
 */
export interface TransactionPanelProps {
  initialDestination?: string;
  initialAmount?: string;
  initialMemo?: string;
  onClose?: () => void;
}

export function TransactionPanel({
  initialDestination,
  initialAmount,
  initialMemo,
  onClose,
}: TransactionPanelProps = {}) {
  const {
    publicKey,
    balance,
    activeNetwork,
    isConnected,
    refreshBalance,
  } = useWallet();

  const {
    status,
    txHash,
    error: txError,
    sendTransaction,
    resetTransaction,
    isProcessing,
  } = useTransaction();

  // ── State Management ──
  const [amount, setAmount] = useState(initialAmount || DEFAULT_SEND_AMOUNT);
  const [destination, setDestination] = useState(initialDestination || DUMMY_DESTINATION);
  const [memo, setMemo] = useState(initialMemo || "");
  const [isFunding, setIsFunding] = useState(false);
  const [fundingMessage, setFundingMessage] = useState<string | null>(null);

  // Keep state synced with props specifically when user scans a new QR
  useEffect(() => {
    if (initialDestination) setDestination(initialDestination);
    if (initialAmount) setAmount(initialAmount);
    if (initialMemo) setMemo(initialMemo);
  }, [initialDestination, initialAmount, initialMemo]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleFundTestnet = async () => {
    if (!publicKey) return;
    setIsFunding(true);
    setFundingMessage(null);

    try {
      await fundTestnetAccount(publicKey, activeNetwork);
      setFundingMessage("Testnet account funded successfully! Refreshing balance...");
      await refreshBalance();
      // Clear success message after 3s
      setTimeout(() => setFundingMessage(null), 3000);
    } catch (error: any) {
      setFundingMessage(error.message || "Failed to fund testnet account.");
    } finally {
      setIsFunding(false);
    }
  };

  // ── Not connected ──────────────────────────────────────────────────────

  if (!isConnected || !publicKey) {
    return (
      <div
        id="transaction-panel-disconnected"
        className="flex flex-col items-center justify-center rounded-2xl border border-stellar-700/20 bg-cosmos-800/30 p-10 text-center backdrop-blur-sm"
      >
        <div className="mb-4 rounded-full bg-stellar-900/40 p-4">
          <svg
            className="h-8 w-8 text-stellar-500/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
            />
          </svg>
        </div>
        <p className="text-sm text-stellar-400/60">
          Connect your wallet to view balance and send transactions.
        </p>
      </div>
    );
  }

  // ── Fund account via Friendbot ─────────────────────────────────────────
  // Note: handleFundTestnet already exists above to process funding.

  // ── Send transaction ───────────────────────────────────────────────────

  // ── Execute Wallet Transaction ──
  const handleSend = () => {
    // We send payload to useTransaction which handles Freighter interface natively
    sendTransaction({
      destination,
      amount,
      memo: memo.trim() || undefined,
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      id="transaction-panel"
      className="space-y-6"
    >
      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl border border-stellar-700/20 bg-gradient-to-br from-cosmos-800/60 via-cosmos-800/40 to-stellar-900/20 p-6 backdrop-blur-sm">
        {/* Decorative gradient orb */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-stellar-500/5 blur-3xl" />

        <div className="relative">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stellar-400/60">
            XLM Balance
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-white">
              {balance
                ? parseFloat(balance).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })
                : "—"}
            </span>
            <span className="text-lg font-medium text-stellar-400/60">
              XLM
            </span>
          </div>

          {/* Refresh button */}
          <button
            id="refresh-balance-btn"
            onClick={refreshBalance}
            className="mt-3 flex items-center gap-1.5 text-xs text-stellar-400/50 transition-colors hover:text-stellar-300"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Friendbot Funding */}
      <div className="rounded-2xl border border-amber-500/15 bg-amber-900/5 p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400/70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-xs text-amber-300/70">
              Need testnet XLM? Use Friendbot to fund your account.
            </p>
            <button
              id="fund-account-btn"
              onClick={handleFundTestnet}
              disabled={isFunding}
              className="mt-2 rounded-lg border border-amber-500/20 bg-amber-900/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition-all duration-300 hover:border-amber-400/40 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFunding ? "Funding..." : "Fund with Friendbot"}
            </button>
            {fundingMessage && (
              <p className="mt-2 text-xs text-amber-300/60">
                {fundingMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Form */}
      <div className="rounded-2xl border border-stellar-700/20 bg-cosmos-800/30 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Send Test Transaction
        </h3>

        {/* Destination */}
        <div className="mb-4">
          <label
            htmlFor="tx-destination"
            className="mb-1.5 block text-xs font-medium text-stellar-400/70"
          >
            Destination Address
          </label>
          <input
            id="tx-destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="G..."
            className="w-full rounded-xl border border-stellar-700/30 bg-cosmos-900/50 px-4 py-2.5 font-mono text-sm text-stellar-200 placeholder-stellar-600/30 outline-none transition-all duration-300 focus:border-stellar-500/50 focus:ring-1 focus:ring-stellar-500/20"
          />
          <p className="mt-1 text-xs text-stellar-500/40">
            Default: dummy testnet address ({truncateAddress(DUMMY_DESTINATION, 6)})
          </p>
        </div>

        {/* Amount */}
        <div className="mb-5">
          <label
            htmlFor="tx-amount"
            className="mb-1.5 block text-xs font-medium text-stellar-400/70"
          >
            Amount (XLM)
          </label>
          <input
            id="tx-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.0000001"
            step="0.1"
            className="w-full rounded-xl border border-stellar-700/30 bg-cosmos-900/50 px-4 py-2.5 font-mono text-sm text-stellar-200 placeholder-stellar-600/30 outline-none transition-all duration-300 focus:border-stellar-500/50 focus:ring-1 focus:ring-stellar-500/20"
          />
        </div>

        {/* Memo */}
        <div className="mb-5">
          <label
            htmlFor="tx-memo"
            className="mb-1.5 block text-xs font-medium text-stellar-400/70"
          >
            Memo (Optional)
          </label>
          <input
            id="tx-memo"
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={28}
            placeholder="For pizza..."
            className="w-full rounded-xl border border-stellar-700/30 bg-cosmos-900/50 px-4 py-2.5 text-sm text-stellar-200 placeholder-stellar-600/30 outline-none transition-all duration-300 focus:border-stellar-500/50 focus:ring-1 focus:ring-stellar-500/20"
          />
        </div>

        {/* Send button */}
        <button
          id="send-transaction-btn"
          onClick={handleSend}
          disabled={isProcessing || !amount || !destination}
          className="w-full rounded-xl bg-gradient-to-r from-stellar-600 to-nebula-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-stellar-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-stellar-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Send {amount} XLM
            </span>
          )}
        </button>

        {/* Transaction Feedback */}
        <TransactionFeedback
          status={status}
          txHash={txHash}
          error={txError}
          onReset={resetTransaction}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
