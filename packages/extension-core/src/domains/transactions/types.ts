import { Address } from "@talismn/balances"
import { EthNetworkId, TokenId } from "@talismn/chaindata-provider"
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
  | {
      type: "transfer"
      tokenId: TokenId
      value: string
      to: Address
    }
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

export type WalletTransactionBase = WalletTransactionTransferInfo & {
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

export type WalletTransactionEth = WalletTransactionBase & {
  networkType: "evm"
  evmNetworkId: EthNetworkId
  unsigned: TransactionRequest<string>
}

export type WalletTransactionDot = WalletTransactionBase & {
  networkType: "substrate"
  genesisHash: `0x${string}`
  unsigned: SignerPayloadJSON
}

export type WalletTransactionSol = WalletTransactionBase & {
  networkType: "solana"
  networkId: string
  serialized: string // base58 encoded
  lastValidBlockHeight: number // required for rpc node to detect transaction confirmation
  // TODO might want to store the SLOT instead of blockNumber, blockNumbers are not a thing because blockHeight and slot are 2 different things
}

// Named Wallet* this to avoid conflicts with types from various Dexie, Polkadot and Ethers libraries
// TODO migrate to a better format, solana doesnt fit with most base properties
export type WalletTransaction = WalletTransactionEth | WalletTransactionDot | WalletTransactionSol
