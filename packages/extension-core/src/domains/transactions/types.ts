import { Address } from "@talismn/balances"
import { DotNetworkId, EthNetworkId, SolNetworkId, TokenId } from "@talismn/chaindata-provider"
import { TransactionRequest } from "viem"

import { SignerPayloadJSON } from "../signing/types"

// unknown for substrate txs from dapps
export type TransactionStatus = "unknown" | "pending" | "success" | "error" | "replaced"

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
}

export type WalletTransaction = WalletTransactionDot | WalletTransactionEth | WalletTransactionSol
