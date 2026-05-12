import { NetworkConfig } from "@/types";

// ─── Network Configuration ───────────────────────────────────────────────────

export const STELLAR_TESTNET: NetworkConfig = {
  name: "Stellar Testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  horizonUrl: "https://horizon-testnet.stellar.org",
  explorerUrl: "https://stellar.expert/explorer/testnet",
  friendbotUrl: "https://friendbot.stellar.org",
};

export const STELLAR_MAINNET: NetworkConfig = {
  name: "Stellar Mainnet",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  horizonUrl: "https://horizon.stellar.org",
  explorerUrl: "https://stellar.expert/explorer/public",
};

export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  [STELLAR_TESTNET.networkPassphrase]: STELLAR_TESTNET,
  [STELLAR_MAINNET.networkPassphrase]: STELLAR_MAINNET,
};

// ─── Dummy Testnet Destination ───────────────────────────────────────────────

/** A well-known testnet address used as a dummy destination for test transactions */
export const DUMMY_DESTINATION =
  "GB3D77QXGYUPRDCPISTPEMDOKLCMRSZ6UCW5HWYFOFGPT6GCQJNQSJSY";

/** Default amount of XLM for test transactions */
export const DEFAULT_SEND_AMOUNT = "1";

// ─── Transaction Config ─────────────────────────────────────────────────────

/** Base fee in stroops (1 stroop = 0.0000001 XLM) */
export const BASE_FEE = "100";

/** Transaction timeout in seconds */
export const TX_TIMEOUT_SECONDS = 300;

// ─── Freighter ───────────────────────────────────────────────────────────────

export const FREIGHTER_DOWNLOAD_URL = "https://www.freighter.app/";

// ─── Explorer Helpers ────────────────────────────────────────────────────────

export function getExplorerTxUrl(txHash: string, network: NetworkConfig): string {
  return `${network.explorerUrl}/tx/${txHash}`;
}

export function getExplorerAccountUrl(accountId: string, network: NetworkConfig): string {
  return `${network.explorerUrl}/account/${accountId}`;
}
