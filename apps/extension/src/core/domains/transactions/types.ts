import { SignerPayloadJSON } from "@core/domains/signing/types"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { ethers } from "ethers"

export type WatchTransactionOptions = {
  siteUrl?: string
  notifications?: boolean
}

// unknown for substrate txs from dapps
export type TransactionStatus = "unknown" | "pending" | "success" | "error" | "replaced"

export type EvmWalletTransaction = {
  networkType: "evm"
  account: string
  evmNetworkId: EvmNetworkId
  siteUrl?: string
  timestamp: number
  hash: string
  status: TransactionStatus
  isReplacement?: boolean

  // replay
  unsigned: ethers.providers.TransactionRequest
  nonce: number

  // display
  label?: string
  tokenId?: string
  value?: string

  // lookup
  blockNumber?: string
}

export type SubWalletTransaction = {
  networkType: "substrate"
  account: string
  genesisHash: string
  siteUrl?: string
  timestamp: number
  hash: string
  isReplacement?: boolean

  // replay
  unsigned: SignerPayloadJSON
  nonce: number

  // display
  label?: string
  tokenId?: string
  value?: string

  // lookup
  blockNumber?: string
  extrinsicIndex?: number
  status: TransactionStatus
}

// Named Wallet* this to avoid conflicts with types from various Dexie, Polkadot and Ethers libraries
export type WalletTransaction = EvmWalletTransaction | SubWalletTransaction
