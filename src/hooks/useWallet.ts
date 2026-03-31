"use client";

import { useWalletContext } from "@/context/WalletProvider";

/**
 * Custom hook for wallet connection state and actions.
 *
 * Exposes a clean interface to components without needing
 * to understand the underlying context shape.
 */
export function useWallet() {
  const {
    publicKey,
    accounts,
    balance,
    connectionStatus,
    error,
    connect,
    disconnect,
    switchAccount,
    refreshBalance,
    isFreighterInstalled,
  } = useWalletContext();

  const isConnected = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";
  const hasError = connectionStatus === "error";

  return {
    // State
    publicKey,
    accounts,
    balance,
    connectionStatus,
    error,
    isConnected,
    isConnecting,
    hasError,
    isFreighterInstalled,

    // Actions
    connect,
    disconnect,
    switchAccount,
    refreshBalance,
  };
}
