import { ChainId } from "@core/domains/chains/types"
import { SignerPayloadJSON } from "@core/domains/signing/types"
import { TokenId } from "@core/domains/tokens/types"
import { HexString } from "@polkadot/util/types"
import { ethers } from "ethers"

import { EthGasSettings, EvmNetworkId } from "../ethereum/types"

// Asset Transfer Messages
export type AssetTransferMethod = "transferKeepAlive" | "transfer" | "transferAll"
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
  gasSettings: EthGasSettings
}
export interface RequestAssetTransferEthHardware {
  evmNetworkId: EvmNetworkId
  tokenId: TokenId
  amount: string
  unsigned: ethers.providers.TransactionRequest
  signedTransaction: string
}

export interface RequestAssetTransferApproveSign {
  unsigned: SignerPayloadJSON
  signature: `0x${string}`
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
