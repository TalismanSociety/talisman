import { ChainId } from "@core/domains/chains/types"
import { SignerPayloadJSON } from "@core/domains/signing/types"
import { TokenId } from "@core/domains/tokens/types"
import { RequestIdOnly } from "@core/types/base"

import { EthGasSettings, EvmNetworkId } from "../ethereum/types"

// Asset Transfer Messages
export interface RequestAssetTransfer {
  chainId: ChainId
  tokenId: TokenId
  fromAddress: string
  toAddress: string
  amount: string
  tip: string
  reapBalance?: boolean
}
export interface RequestAssetTransferEth {
  evmNetworkId: EvmNetworkId
  tokenId: TokenId
  fromAddress: string
  toAddress: string
  amount: string
  gasSettings: EthGasSettings
}

export interface RequestAssetTransferApproveSign {
  id: string
  signature: `0x${string}` | Uint8Array
}

export interface ResponseAssetTransfer {
  id: string
}

export interface ResponseAssetTransferEth {
  hash: string
}

export interface ResponseAssetTransferFeeQuery {
  partialFee: string
  pendingTransferId?: string
  unsigned: SignerPayloadJSON
}

export type TransactionId = string

export type TransactionStatus = "PENDING" | "SUCCESS" | "ERROR"

export type Transaction = {
  id: string
  from: string
  nonce: string
  hash: string
  chainId: ChainId
  blockHash?: string
  blockNumber?: string
  extrinsicIndex?: number
  status: TransactionStatus
  message?: string
  createdAt: number
}

export type TransactionList = Record<TransactionId, Transaction>

export interface AssetTransferMessages {
  // asset transfer signatures
  "pri(assets.transfer)": [RequestAssetTransfer, ResponseAssetTransfer]
  "pri(assets.transferEth)": [RequestAssetTransferEth, ResponseAssetTransferEth]
  "pri(assets.transfer.checkFees)": [RequestAssetTransfer, ResponseAssetTransferFeeQuery]
  "pri(assets.transfer.approveSign)": [RequestAssetTransferApproveSign, ResponseAssetTransfer]

  // transaction message signatures
  "pri(transactions.byid.subscribe)": [RequestIdOnly, boolean, any]
  "pri(transactions.subscribe)": [null, boolean, any]
}
