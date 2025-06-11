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
  /**
   * Used to store extra information about this tx.
   * For populating the transaction history.
   * In the future we should migrate transferInfo into this.
   */
  txInfo?: WalletTransactionInfo
}

export type WalletTransactionTransferInfo = {
  tokenId?: TokenId
  value?: string
  to?: Address
}

export type WalletTransactionInfo =
  // | {
  //     /**
  //      * NOTE: Not used yet.
  //      * We need to migrate existing txs from `transferInfo` to txInfo,
  //      * where txInfo["type"] === "transfer".
  //      */
  //     type: "transfer"
  //     tokenId: TokenId
  //     value: string
  //     to: Address
  //   } |
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
  nonce: number
  blockNumber?: string
  confirmed?: boolean
  txInfo?: WalletTransactionInfo
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
