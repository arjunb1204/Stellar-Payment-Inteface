"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { WalletContextValue, ConnectionStatus } from "@/types";
import { fetchNativeBalance } from "@/lib/stellar";
import { ACTIVE_NETWORK, FREIGHTER_DOWNLOAD_URL } from "@/lib/constants";

// ─── Context ─────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [balance, setBalance] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);

  // Restore accounts from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("stellar-accounts");
      if (saved) {
        setAccounts(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  // Sync accounts to localStorage
  useEffect(() => {
    if (accounts.length > 0) {
      localStorage.setItem("stellar-accounts", JSON.stringify(accounts));
    } else {
      localStorage.removeItem("stellar-accounts");
    }
  }, [accounts]);

  // Prevent stale closures in async callbacks
  const publicKeyRef = useRef(publicKey);
  publicKeyRef.current = publicKey;

  // ── Detect Freighter on mount ────────────────────────────────────────────

  useEffect(() => {
    const checkFreighter = async () => {
      try {
        const freighterApi = await import("@stellar/freighter-api");
        const result = await freighterApi.isConnected();

        if (typeof result === "object" && result !== null) {
          setIsFreighterInstalled(result.isConnected ?? false);
        } else {
          setIsFreighterInstalled(!!result);
        }
      } catch {
        setIsFreighterInstalled(false);
      }
    };
    checkFreighter();
  }, []);

  // ── Refresh Balance ──────────────────────────────────────────────────────

  const refreshBalance = useCallback(async () => {
    const key = publicKeyRef.current;
    if (!key) return;

    try {
      const xlmBalance = await fetchNativeBalance(key);
      setBalance(xlmBalance);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch balance";
      console.error("Balance fetch error:", message);
      setBalance(null);
      // Don't overwrite connection error — balance errors are non-fatal
    }
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setError(null);
    setConnectionStatus("connecting");

    try {
      const freighterApi = await import("@stellar/freighter-api");

      // Check installation
      const connected = await freighterApi.isConnected();
      const isInstalled =
        typeof connected === "object"
          ? connected.isConnected ?? false
          : !!connected;

      if (!isInstalled) {
        setIsFreighterInstalled(false);
        throw new Error(
          `Freighter wallet is not installed. Get it at ${FREIGHTER_DOWNLOAD_URL}`
        );
      }

      setIsFreighterInstalled(true);

      // Request access — this opens the Freighter popup
      const accessResult = await freighterApi.requestAccess();

      // Handle the response shape (varies by version)
      let address: string;
      if (typeof accessResult === "string") {
        address = accessResult;
      } else if (
        typeof accessResult === "object" &&
        accessResult !== null &&
        "address" in accessResult
      ) {
        address = (accessResult as { address: string }).address;
      } else {
        throw new Error("Unexpected response from Freighter.");
      }

      if (!address || !address.startsWith("G")) {
        throw new Error("Invalid public key received from Freighter.");
      }

      // Verify we're on the right network
      try {
        const networkResult = await freighterApi.getNetwork();
        const networkPassphrase =
          typeof networkResult === "string"
            ? networkResult
            : typeof networkResult === "object" &&
              networkResult !== null &&
              "networkPassphrase" in networkResult
            ? (networkResult as { networkPassphrase: string }).networkPassphrase
            : null;

        if (
          networkPassphrase &&
          networkPassphrase !== ACTIVE_NETWORK.networkPassphrase
        ) {
          console.warn(
            `Freighter is on a different network. Expected: ${ACTIVE_NETWORK.name}`
          );
        }
      } catch {
        // Network check is non-critical — continue anyway
        console.warn("Could not verify Freighter network.");
      }

      setPublicKey(address);
      setAccounts((prev) => Array.from(new Set([...prev, address])));
      setConnectionStatus("connected");

      // Fetch balance after connection
      try {
        const xlmBalance = await fetchNativeBalance(address);
        setBalance(xlmBalance);
      } catch {
        // Balance fetch failure is non-fatal on connect
        setBalance(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Connection failed";

      // User explicitly rejected the connection request
      if (
        message.toLowerCase().includes("user") &&
        message.toLowerCase().includes("reject")
      ) {
        setError("Connection request was rejected.");
      } else if (message.toLowerCase().includes("cancel")) {
        setError("Connection was cancelled.");
      } else {
        setError(message);
      }

      setConnectionStatus("error");
      setPublicKey(null);
      setBalance(null);
    }
  }, []);

  const switchAccount = useCallback((address: string) => {
    setPublicKey(address);
    setAccounts((prev) => Array.from(new Set([...prev, address])));
    setConnectionStatus("connected");
    setBalance(null); // will auto-fetch via interval/effect
  }, []);

  // ── Disconnect ───────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setAccounts([]);
    setBalance(null);
    setConnectionStatus("disconnected");
    setError(null);
  }, []);

  // ── Auto-refresh balance every 30s ───────────────────────────────────────

  useEffect(() => {
    if (connectionStatus !== "connected" || !publicKey) return;

    const interval = setInterval(refreshBalance, 30_000);
    return () => clearInterval(interval);
  }, [connectionStatus, publicKey, refreshBalance]);

  // ── Context value ────────────────────────────────────────────────────────

  const value: WalletContextValue = {
    publicKey,
    accounts,
    balance,
    connectionStatus,
    error,
    connect,
    switchAccount,
    disconnect,
    refreshBalance,
    isFreighterInstalled,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWalletContext(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}
