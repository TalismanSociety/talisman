import { HexString } from "@polkadot/util/types"
import { Address } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { TransactionRequest } from "viem"

import { ChainId } from "../chains/types"
import { EthGasSettings, EvmNetworkId } from "../ethereum/types"
import { SignerPayloadJSON } from "../signing/types"
import { WalletTransactionTransferInfo } from "../transactions"

// Asset Transfer Messages
export type AssetTransferMethod = "transferKeepAlive" | "transferAllowDeath" | "transferAll"
export interface RequestAssetTransfer {
  chainId: ChainId
  tokenId: TokenId
  fromAddress: string
  toAddress: string
  amount?: string
  tip?: string
  method?: AssetTransferMethod
}
export interface RequestAssetTransferEth {
  evmNetworkId: EvmNetworkId
  tokenId: TokenId
  fromAddress: string
  toAddress: string
  amount: string
  gasSettings: EthGasSettings<string>
}
export interface RequestAssetTransferEthHardware {
  evmNetworkId: EvmNetworkId
  tokenId: TokenId
  amount: string
  to: Address
  unsigned: TransactionRequest<string>
  signedTransaction: `0x${string}`
}

export interface RequestAssetTransferApproveSign {
  unsigned: SignerPayloadJSON
  signature: `0x${string}`
  transferInfo: WalletTransactionTransferInfo
}

export interface ResponseAssetTransfer {
  hash: HexString
}

export interface ResponseAssetTransferFeeQuery {
  partialFee: string
  unsigned: SignerPayloadJSON
}

export interface AssetTransferMessages {
  // asset transfer signatures
  "pri(assets.transfer)": [RequestAssetTransfer, ResponseAssetTransfer]
  "pri(assets.transferEth)": [RequestAssetTransferEth, ResponseAssetTransfer]
  "pri(assets.transferEthHardware)": [RequestAssetTransferEthHardware, ResponseAssetTransfer]
  "pri(assets.transfer.checkFees)": [RequestAssetTransfer, ResponseAssetTransferFeeQuery]
  "pri(assets.transfer.approveSign)": [RequestAssetTransferApproveSign, ResponseAssetTransfer]
}
