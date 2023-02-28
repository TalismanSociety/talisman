import { SignerPayloadJSON } from "@core/domains/signing/types"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { UnsignedTransaction } from "ethers"

// unknown for substrate txs from dapps
export type TransactionStatus = "unknown" | "pending" | "success" | "error"

export type EvmWalletTransaction = {
  networkType: "evm"
  account: string
  networkId: EvmNetworkId
  siteUrl?: string
  timestamp: number
  hash: string
  status: TransactionStatus

  // replay
  unsigned: UnsignedTransaction
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
  chainId?: ChainId
  timestamp: number
  hash: string

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

// named like this to avoid conflicts with types from various Dexie, Polkadot and Ethers libraries
export type WalletTransaction = EvmWalletTransaction | SubWalletTransaction
