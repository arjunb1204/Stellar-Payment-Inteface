import * as StellarSdk from "@stellar/stellar-sdk";
import { ACTIVE_NETWORK, BASE_FEE, TX_TIMEOUT_SECONDS } from "./constants";
import type { TransactionParams } from "@/types";

// ─── Horizon Server Singleton ────────────────────────────────────────────────

let _server: StellarSdk.Horizon.Server | null = null;

export function getServer(): StellarSdk.Horizon.Server {
  if (!_server) {
    _server = new StellarSdk.Horizon.Server(ACTIVE_NETWORK.horizonUrl);
  }
  return _server;
}

// ─── Account & Balance ───────────────────────────────────────────────────────

/**
 * Load a Stellar account from Horizon.
 * Throws a descriptive error if the account doesn't exist (not funded).
 */
export async function loadAccount(
  publicKey: string
): Promise<StellarSdk.Horizon.AccountResponse> {
  try {
    const server = getServer();
    return await server.loadAccount(publicKey);
  } catch (err: unknown) {
    if (
      err instanceof StellarSdk.NotFoundError ||
      (err instanceof Error && err.message.includes("404"))
    ) {
      throw new Error(
        "Account not found on the network. Please fund it using Friendbot on testnet."
      );
    }
    throw err;
  }
}

/**
 * Fetch the native XLM balance for a given public key.
 * Returns the balance as a string with up to 7 decimal places.
 */
export async function fetchNativeBalance(publicKey: string): Promise<string> {
  const account = await loadAccount(publicKey);
  const nativeBalance = account.balances.find(
    (b) => b.asset_type === "native"
  );
  return nativeBalance ? nativeBalance.balance : "0";
}

// ─── Transaction Building ────────────────────────────────────────────────────

/**
 * Build a Stellar payment transaction (XLM native asset).
 * Returns the built transaction as an XDR string for wallet signing.
 */
export async function buildPaymentTransaction(
  sourcePublicKey: string,
  params: TransactionParams
): Promise<string> {
  const server = getServer();
  const sourceAccount = await server.loadAccount(sourcePublicKey);

  const transactionBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  });

  transactionBuilder.addOperation(
    StellarSdk.Operation.payment({
      destination: params.destination,
      asset: StellarSdk.Asset.native(),
      amount: params.amount,
    })
  );

  if (params.memo) {
    transactionBuilder.addMemo(StellarSdk.Memo.text(params.memo));
  }

  transactionBuilder.setTimeout(TX_TIMEOUT_SECONDS);

  const transaction = transactionBuilder.build();
  return transaction.toXDR();
}

/**
 * Submit a signed transaction XDR to the Stellar network.
 * Returns the transaction hash on success.
 */
export async function submitTransaction(
  signedXdr: string
): Promise<string> {
  const server = getServer();
  const transaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    ACTIVE_NETWORK.networkPassphrase
  );

  try {
    const response = await server.submitTransaction(transaction);

    if ("hash" in response && typeof response.hash === "string") {
      return response.hash;
    }

    throw new Error("Transaction submission failed: no hash in response.");
  } catch (err: any) {
    const data = err.response?.data;
    
    if (data) {
      console.error("Horizon Error Data:", JSON.stringify(data));
      
      const resultCodes = data.extras?.result_codes;
      if (resultCodes) {
        if (resultCodes.operations && resultCodes.operations.length > 0) {
          if (resultCodes.operations[0] === "op_underfunded") {
             throw new Error("Transaction Failed: Insufficient XLM balance to complete this payment.");
          }
          throw new Error(`Stellar Operation Error: ${resultCodes.operations[0]}`);
        } else if (resultCodes.transaction) {
          if (resultCodes.transaction === "tx_too_late") {
             throw new Error("Signature Request Expired (tx_too_late). Please sign within 5 minutes.");
          }
          throw new Error(`Stellar Transaction Error: ${resultCodes.transaction}`);
        }
      }
      
      if (data.extras?.reason) {
        throw new Error(`Stellar Error: ${data.extras.reason}`);
      }
      
      if (data.detail) {
        throw new Error(`Stellar Network Error: ${data.detail}`);
      }
    }
    
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(err?.message || "An unknown network error occurred while submitting the transaction.");
  }
}

// ─── Friendbot (Testnet only) ────────────────────────────────────────────────

/**
 * Fund a testnet account using Friendbot.
 */
export async function fundTestnetAccount(publicKey: string): Promise<void> {
  if (!ACTIVE_NETWORK.friendbotUrl) {
    throw new Error("Friendbot is only available on testnet.");
  }

  const response = await fetch(
    `${ACTIVE_NETWORK.friendbotUrl}?addr=${encodeURIComponent(publicKey)}`
  );

  if (!response.ok) {
    const body = await response.text();
    // Already funded accounts return an error — that's okay
    if (body.includes("createAccountAlreadyExist")) {
      return; // Account already exists, no problem
    }
    throw new Error(`Friendbot funding failed: ${response.status}`);
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Truncate a Stellar public key for display: GABCD...WXYZ
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
