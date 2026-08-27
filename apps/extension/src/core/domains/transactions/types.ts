import type { Address } from "@talismn/balances"
import type {
  BtcNetworkId,
  DotNetworkId,
  EthNetworkId,
  SolNetworkId,
  TokenId,
} from "@talismn/chaindata-provider"
import type { TransactionRequest } from "viem"

import type { SignerPayloadJSON } from "../signing/types"

// unknown for substrate txs from dapps
export type TransactionStatus = "unknown" | "pending" | "success" | "error" | "replaced"

// Exchange-level status for swap transactions, tracked by the background watcher.
export type SwapStatus =
  | "waiting"
  | "confirming"
  | "exchanging"
  | "sending"
  | "verifying"
  | "finished"
  | "failed"
  | "expired"
  | "refunded"
  | "invalid"
  | "not_found"
  | "unknown"

export const FINAL_SWAP_STATUSES: SwapStatus[] = [
  "finished",
  "failed",
  "expired",
  "refunded",
  "invalid",
]

export type WatchTransactionOptions = {
  siteUrl?: string
  notifications?: boolean
  /**
   * Used to store extra information about this tx.
   * For populating the transaction history.
   * In the future we should migrate transferInfo into this.
   */
  txInfo?: WalletTransactionInfo
}

/** @deprecated */
export type WalletTransactionTransferInfo = {
  /** @deprecated */
  tokenId?: TokenId
  /** @deprecated */
  value?: string
  /** @deprecated */
  to?: Address
}

export type WalletTransactionInfo =
  | { type: "transfer"; tokenId: TokenId; value: string; to: Address }
  | { type: "approve-erc20"; tokenId: TokenId; contractAddress: string; amount: string }
  | {
      type: "swap-simpleswap"
      exchangeId: string
      fromTokenId: TokenId
      toTokenId: TokenId
      fromAmount: string
      toAmount: string
      to: Address
    }
  | {
      type: "swap-stealthex"
      exchangeId: string
      fromTokenId: TokenId
      toTokenId: TokenId
      fromAmount: string
      toAmount: string
      to: Address
    }
  | {
      type: "swap-lifi"
      protocolName: string
      fromTokenId: TokenId
      toTokenId: TokenId
      fromAmount: string
      toAmount: string
      to: Address
    }
  | {
      type: "bittensor-staking"
      fromTokenId: TokenId
      toTokenId: TokenId
      fromAmount: string
      toAmount: string
      hotkey: string
    }

/** @deprecated */
export type LegacyWalletTransactionBase = WalletTransactionTransferInfo & {
  account: Address
  siteUrl?: string
  timestamp: number
  hash: string
  status: TransactionStatus
  isReplacement?: boolean
  label?: string
  nonce?: number
  blockNumber?: string
  confirmed?: boolean
  txInfo?: WalletTransactionInfo
}

/** @deprecated */
export type LegacyWalletTransactionEth = LegacyWalletTransactionBase & {
  networkType: "evm"
  evmNetworkId: EthNetworkId
  unsigned: TransactionRequest<string>
}

/** @deprecated */
export type LegacyWalletTransactionDot = LegacyWalletTransactionBase & {
  networkType: "substrate"
  genesisHash: `0x${string}`
  unsigned: SignerPayloadJSON
}

// Named Wallet* this to avoid conflicts with types from various Dexie, Polkadot and Ethers libraries
/** @deprecated */
export type LegacyWalletTransaction = LegacyWalletTransactionEth | LegacyWalletTransactionDot

export type WalletTransactionDot = {
  id: string
  platform: "polkadot"
  networkId: DotNetworkId
  account: Address
  hash: `0x${string}`
  payload: SignerPayloadJSON
  status: TransactionStatus
  confirmed: boolean
  siteUrl?: string
  label?: string
  nonce: number
  timestamp: number
  txInfo?: WalletTransactionInfo
  swapStatus?: SwapStatus
  blockNumber?: string
  extrinsicIndex?: number
}

export type WalletTransactionEth = {
  id: string
  platform: "ethereum"
  networkId: EthNetworkId
  account: `0x${string}`
  status: TransactionStatus
  confirmed: boolean
  payload: TransactionRequest<string>
  hash: `0x${string}`
  siteUrl?: string
  label?: string
  nonce: number
  timestamp: number
  txInfo?: WalletTransactionInfo
  swapStatus?: SwapStatus
  blockNumber?: string
  isReplacement?: boolean
}

export type WalletTransactionSol = {
  id: string
  platform: "solana"
  networkId: SolNetworkId
  account: string
  status: TransactionStatus
  confirmed: boolean
  payload: string // base58 encoded Transaction (legacy) or VersionedTransaction (new)
  signature: string // base58 encoded signature, serves as tx hash for crafting block explorer links
  siteUrl?: string
  label?: string
  timestamp: number
  txInfo?: WalletTransactionInfo
  swapStatus?: SwapStatus
}

export type WalletTransactionBtc = {
  id: string
  platform: "bitcoin"
  networkId: BtcNetworkId
  /** account identity: payments xpub for HD accounts, bc1q address for WIF accounts */
  account: string
  status: TransactionStatus
  confirmed: boolean
  /** final signed transaction hex */
  payload: string
  /** txid, plain hex (no 0x prefix) — matches block explorer urls */
  hash: string
  siteUrl?: string
  label?: string
  timestamp: number
  txInfo?: WalletTransactionInfo
  swapStatus?: SwapStatus
  blockNumber?: string
}

export type WalletTransaction =
  | WalletTransactionDot
  | WalletTransactionEth
  | WalletTransactionSol
  | WalletTransactionBtc
