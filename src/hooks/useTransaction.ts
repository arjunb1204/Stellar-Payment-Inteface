"use client";

import { useState, useCallback } from "react";
import type { TransactionState, TransactionParams } from "@/types";
import { buildPaymentTransaction, submitTransaction } from "@/lib/stellar";
import { ACTIVE_NETWORK } from "@/lib/constants";
import { useWallet } from "./useWallet";

/**
 * Custom hook for building, signing, and submitting Stellar transactions.
 *
 * Manages the full transaction lifecycle with granular status tracking
 * so the UI can show appropriate feedback at each step.
 */
export function useTransaction() {
  const { publicKey, refreshBalance } = useWallet();

  const [state, setState] = useState<TransactionState>({
    status: "idle",
    txHash: null,
    error: null,
  });

  const resetTransaction = useCallback(() => {
    setState({ status: "idle", txHash: null, error: null });
  }, []);

  const sendTransaction = useCallback(
    async (params: TransactionParams) => {
      if (!publicKey) {
        setState({
          status: "error",
          txHash: null,
          error: "Wallet is not connected.",
        });
        return;
      }

      // Reset state before starting
      setState({ status: "building", txHash: null, error: null });

      try {
        // ── Step 1: Build the transaction ──────────────────────────────

        const unsignedXdr = await buildPaymentTransaction(publicKey, params);

        // ── Step 2: Sign via Freighter ─────────────────────────────────

        setState((prev) => ({ ...prev, status: "signing" }));

        const freighterApi = await import("@stellar/freighter-api");

        const signResult = await freighterApi.signTransaction(unsignedXdr, {
          networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
        });

        // Handle response shape variations
        let signedXdr: string;
        if (typeof signResult === "string") {
          signedXdr = signResult;
        } else if (
          typeof signResult === "object" &&
          signResult !== null &&
          "signedTxXdr" in signResult
        ) {
          signedXdr = (signResult as { signedTxXdr: string }).signedTxXdr;
        } else {
          throw new Error("Failed to get signed transaction from Freighter.");
        }

        // ── Step 3: Submit to the network ──────────────────────────────

        setState((prev) => ({ ...prev, status: "submitting" }));

        const txHash = await submitTransaction(signedXdr);

        setState({ status: "success", txHash, error: null });

        // Refresh balance after successful transaction
        await refreshBalance();
      } catch (err: unknown) {
        let message = "Transaction failed.";

        if (err instanceof Error) {
          // User rejected the signing popup
          if (
            err.message.toLowerCase().includes("user") &&
            (err.message.toLowerCase().includes("cancel") ||
              err.message.toLowerCase().includes("reject") ||
              err.message.toLowerCase().includes("denied"))
          ) {
            message = "Transaction was rejected by the user.";
          }
          // Insufficient funds
          else if (
            err.message.toLowerCase().includes("underfunded") ||
            err.message.toLowerCase().includes("insufficient")
          ) {
            message =
              "Insufficient XLM balance. Fund your testnet account using Friendbot.";
          }
          // Destination account not found
          else if (
            err.message.toLowerCase().includes("destination") &&
            err.message.toLowerCase().includes("not")
          ) {
            message =
              "Destination account does not exist on the network.";
          }
          // Network error
          else if (
            err.message.toLowerCase().includes("network") ||
            err.message.toLowerCase().includes("fetch")
          ) {
            message =
              "Network error. Please check your connection and try again.";
          }
          // Fallback to original message
          else {
            message = err.message;
          }
        }

        setState({ status: "error", txHash: null, error: message });
      }
    },
    [publicKey, refreshBalance]
  );

  return {
    ...state,
    sendTransaction,
    resetTransaction,
    isIdle: state.status === "idle",
    isProcessing: ["building", "signing", "submitting"].includes(state.status),
    isSuccess: state.status === "success",
    isError: state.status === "error",
  };
}
