"use client";

import React from "react";
import { useWallet } from "@/hooks/useWallet";
import { useHistory } from "@/hooks/useHistory";
import { truncateAddress } from "@/lib/stellar";
import { getExplorerTxUrl } from "@/lib/constants";

export function TransactionHistory() {
  const { publicKey, activeNetwork } = useWallet();
  const { history, isLoading, error, fetchHistory } = useHistory(publicKey, activeNetwork);

  if (!publicKey) return null;

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-end">
        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-stellar-400 transition-colors hover:text-stellar-300 disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="sr-only">Refresh History</span>
        </button>
      </div>

      {isLoading && history.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stellar-500/30 border-t-stellar-500" />
            <span className="text-xs text-stellar-400/60">Syncing ledger...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-xs text-red-400/80">{error}</p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="mb-3 rounded-full bg-cosmos-800/80 p-3">
            <svg className="h-6 w-6 text-stellar-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-stellar-300/80">No transactions yet</p>
          <p className="mt-1 text-xs text-stellar-500/60">Fund your wallet or send a payment to see history here.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
          {history.map((tx) => {
            const isSend = tx.from === publicKey;
            const amountStr = parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const counterparty = isSend ? tx.to : tx.from;
            const isCreateAccount = tx.type === "create_account";

            return (
              <a
                key={tx.id}
                href={getExplorerTxUrl(tx.id, activeNetwork)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between border-b border-zinc-800/60 py-4 transition-all hover:bg-zinc-800/20"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full overflow-hidden border-2 border-zinc-700/50 bg-zinc-800 ${isSend ? "opacity-90" : "opacity-100"}`}>
                    {isCreateAccount ? (
                      <img src="https://stellar.org/favicon.ico" alt="bot" className="h-full w-full object-cover" />
                    ) : (
                      <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${counterparty}`} alt="avatar" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[15px] font-medium text-zinc-100 group-hover:text-white">
                      {isCreateAccount ? "Stellar Friendbot" : isSend ? `To ${truncateAddress(counterparty, 5)}` : `From ${truncateAddress(counterparty, 5)}`}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {new Date(tx.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className={`text-right font-medium text-[15px] ${isSend ? "text-zinc-100" : "text-emerald-500"}`}>
                  {isSend ? "-" : "+"}{amountStr} XLM
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
