"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { truncateAddress } from "@/lib/stellar";
import { FREIGHTER_DOWNLOAD_URL, getExplorerAccountUrl } from "@/lib/constants";

/**
 * Wallet connection component.
 *
 * - Disconnected: shows a connect button (or install prompt if Freighter is missing)
 * - Connecting: shows a loading spinner
 * - Connected: shows truncated address with disconnect option
 * - Error: shows the error with a retry button
 */
export function WalletConnect() {
  const {
    publicKey,
    accounts,
    connectionStatus,
    error,
    activeNetwork,
    connect,
    disconnect,
    switchAccount,
    isConnected,
    isConnecting,
    isFreighterInstalled,
  } = useWallet();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Not installed ──────────────────────────────────────────────────────

  if (!isFreighterInstalled && connectionStatus === "disconnected") {
    return (
      <div id="wallet-install-prompt" className="flex flex-col items-center gap-3">
        <a
          href={FREIGHTER_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 rounded-xl border border-nebula-600/40 bg-nebula-900/30 px-5 py-3 text-sm font-medium text-nebula-300 transition-all duration-300 hover:border-nebula-500/60 hover:bg-nebula-800/40 hover:text-nebula-200 hover:shadow-lg hover:shadow-nebula-500/10"
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:scale-110"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Install Freighter Wallet
        </a>
        <button
          onClick={connect}
          className="text-xs text-stellar-400/60 underline decoration-dotted transition-colors hover:text-stellar-300"
        >
          I already have it installed
        </button>
      </div>
    );
  }

  // ── Connecting ─────────────────────────────────────────────────────────

  if (isConnecting) {
    return (
      <div
        id="wallet-connecting"
        className="flex items-center gap-3 rounded-xl border border-stellar-600/30 bg-stellar-900/20 px-5 py-3 backdrop-blur-sm"
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stellar-400/30 border-t-stellar-400" />
        <span className="text-sm font-medium text-stellar-300">
          Connecting...
        </span>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────

  if (isConnected && publicKey) {
    return (
      <div id="wallet-connected" className="relative flex items-center justify-center gap-3" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="group flex items-center gap-2 rounded-xl border border-stellar-600/30 bg-cosmos-800/60 px-4 py-2.5 font-mono text-sm text-stellar-200 backdrop-blur-sm transition-all duration-300 hover:border-stellar-500/50 hover:bg-cosmos-700/60"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          {truncateAddress(publicKey, 6)}
          <svg
            className={`h-4 w-4 text-stellar-400/50 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-stellar-300' : 'group-hover:text-stellar-300'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full mt-2 w-48 rounded-xl border border-zinc-700/50 bg-[#1e1e20] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 origin-top">
            <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1 space-y-1">
              {accounts.map(acc => (
                <button
                  key={acc}
                  onClick={() => { switchAccount(acc); setIsDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-mono transition-colors ${
                    acc === publicKey 
                      ? 'bg-stellar-500/10 text-stellar-300 font-medium' 
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {truncateAddress(acc, 6)}
                  {acc === publicKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                </button>
              ))}
            </div>
            
            <div className="my-1.5 h-px bg-zinc-800/50" />
            
            {manualMode ? (
               <form onSubmit={(e) => {
                 e.preventDefault();
                 if (manualInput.length === 56 && manualInput.startsWith("G")) {
                    switchAccount(manualInput.trim());
                    setIsDropdownOpen(false);
                    setManualMode(false);
                    setManualInput("");
                 }
               }} className="px-3 pb-2 pt-1 flex flex-col gap-2">
                 <input 
                   autoFocus
                   type="text" 
                   value={manualInput}
                   onChange={e => setManualInput(e.target.value)}
                   placeholder="Enter Public Key..." 
                   className="w-full text-[10px] bg-zinc-900 border border-zinc-700/50 rounded-lg p-2 text-white outline-none focus:border-emerald-500 font-mono tracking-tighter"
                 />
                 <button disabled={manualInput.length !== 56 || !manualInput.startsWith("G")} type="submit" className="w-full bg-emerald-500/20 text-emerald-400 disabled:text-zinc-600 disabled:bg-zinc-800 hover:bg-emerald-500/30 text-xs py-1.5 rounded-lg transition-all font-semibold">
                   Add Manual Key
                 </button>
               </form>
            ) : (
              <button
                onClick={() => setManualMode(true)}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                 <span className="flex items-center gap-2">
                   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                   Add Account
                 </span>
                 <svg className="h-3 w-3 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            )}

            <button
              onClick={() => { 
                disconnect(); 
                setIsDropdownOpen(false); 
                setManualMode(false); 
                setManualInput(""); 
              }}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
            >
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               Disconnect All
            </button>
            <div className="mt-1 flex justify-center pb-1">
                <a 
                  href={getExplorerAccountUrl(publicKey, activeNetwork)}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest font-semibold flex items-center gap-1"
                >
                  View in Explorer
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────

  if (error) {
    return (
      <div id="wallet-error" className="flex flex-col items-center gap-3">
        <div className="rounded-xl border border-red-500/20 bg-red-900/10 px-4 py-2.5 text-center text-sm text-red-400">
          {error}
        </div>
        <button
          id="wallet-retry-btn"
          onClick={connect}
          className="rounded-xl border border-stellar-600/30 bg-stellar-900/20 px-5 py-2.5 text-sm font-medium text-stellar-300 transition-all duration-300 hover:border-stellar-500/50 hover:bg-stellar-800/30 hover:text-stellar-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Default: Connect button ────────────────────────────────────────────

  return (
    <button
      id="wallet-connect-btn"
      onClick={connect}
      className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-stellar-600 to-nebula-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-stellar-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-stellar-500/40 active:scale-[0.98]"
    >
      <span className="relative z-10 flex items-center gap-2">
        <svg
          className="h-5 w-5 transition-transform group-hover:rotate-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        Connect Wallet
      </span>
      {/* Shimmer overlay */}
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </button>
  );
}
