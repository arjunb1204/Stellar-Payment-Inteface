// ─── Wallet State ────────────────────────────────────────────────────────────

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface WalletState {
  /** Currently connected Stellar public key (G...) */
  publicKey: string | null;
  /** List of all saved/connected public keys */
  accounts: string[];
  /** XLM balance of the currently connected wallet */
  balance: string | null;
  /** Current connection lifecycle status */
  connectionStatus: ConnectionStatus;
  /** Human-readable error message, if any */
  error: string | null;
}

// ─── Wallet Context ──────────────────────────────────────────────────────────

export interface WalletContextValue extends WalletState {
  /** Initiate a connection to the Freighter wallet or add another account */
  connect: () => Promise<void>;
  /** Switch to a different connected account */
  switchAccount: (address: string) => void;
  /** Cleanly disconnect all accounts */
  disconnect: () => void;
  /** Refresh the XLM balance for the connected wallet */
  refreshBalance: () => Promise<void>;
  /** Whether the Freighter extension is installed */
  isFreighterInstalled: boolean;
}

// ─── Transaction ─────────────────────────────────────────────────────────────

export type TransactionStatus = "idle" | "building" | "signing" | "submitting" | "success" | "error";

export interface TransactionState {
  /** Current step in the transaction lifecycle */
  status: TransactionStatus;
  /** Final transaction hash on success */
  txHash: string | null;
  /** Human-readable error message on failure */
  error: string | null;
}

export interface TransactionParams {
  /** Destination Stellar address (G...) */
  destination: string;
  /** Amount of XLM to send */
  amount: string;
  /** Optional memo text */
  memo?: string;
}

// ─── Horizon API Response Types ──────────────────────────────────────────────

export interface HorizonAccountBalance {
  balance: string;
  buying_liabilities: string;
  selling_liabilities: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

export interface HorizonAccountResponse {
  id: string;
  account_id: string;
  sequence: string;
  balances: HorizonAccountBalance[];
  subentry_count: number;
  thresholds: {
    low_threshold: number;
    med_threshold: number;
    high_threshold: number;
  };
}

// ─── Network Configuration ───────────────────────────────────────────────────

export interface NetworkConfig {
  /** Human-readable network name */
  name: string;
  /** Stellar network passphrase */
  networkPassphrase: string;
  /** Horizon API base URL */
  horizonUrl: string;
  /** Block explorer base URL */
  explorerUrl: string;
  /** Friendbot URL for testnet funding */
  friendbotUrl?: string;
}
