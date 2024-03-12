import { Address } from "@talismn/balances"
import { EvmNetworkId, TokenId } from "@talismn/chaindata-provider"
import { TransactionRequest } from "viem"

import { SignerPayloadJSON } from "../signing/types"

// unknown for substrate txs from dapps
export type TransactionStatus = "unknown" | "pending" | "success" | "error" | "replaced"

export type WatchTransactionOptions = {
  siteUrl?: string
  notifications?: boolean
  transferInfo?: WalletTransactionTransferInfo
}

export type WalletTransactionTransferInfo = {
  tokenId?: TokenId
  value?: string
  to?: Address
}

export type WalletTransactionBase = WalletTransactionTransferInfo & {
  account: Address
  siteUrl?: string
  timestamp: number
  hash: string
  status: TransactionStatus
  isReplacement?: boolean
  label?: string
  nonce: number
  blockNumber?: string
}

export type EvmWalletTransaction = WalletTransactionBase & {
  networkType: "evm"
  evmNetworkId: EvmNetworkId
  unsigned: TransactionRequest<string>
}

export type SubWalletTransaction = WalletTransactionBase & {
  networkType: "substrate"
  genesisHash: string
  unsigned: SignerPayloadJSON
}

// Named Wallet* this to avoid conflicts with types from various Dexie, Polkadot and Ethers libraries
export type WalletTransaction = EvmWalletTransaction | SubWalletTransaction
