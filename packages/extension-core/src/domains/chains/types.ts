import { HexString } from "@polkadot/util/types"
import { ChainId } from "@talismn/chaindata-provider"

import { RequestIdOnly } from "../../types/base"
import { SignerPayloadGenesisHash } from "../signing/types"

export type { Chain, ChainId, ChainList, SubstrateRpc } from "@talismn/chaindata-provider"

export type RequestChainGenerateQrAddNetworkSpecs = {
  genesisHash: SignerPayloadGenesisHash // ussing the imported type from above enables us to stay up to date with upstream changes
}

export type RequestChainGenerateQrUpdateNetworkMetadata = {
  genesisHash: SignerPayloadGenesisHash
  specVersion?: number
}

export type RequestUpsertCustomChain = {
  id: ChainId
  isTestnet: boolean
  genesisHash: HexString | null
  // prefix: number | null
  name: string
  // themeColor: string | null
  chainLogoUrl: string | null
  // chainName: string
  // implName: string
  // specName: string
  // specVersion: string
  nativeTokenSymbol: string
  nativeTokenDecimals: number
  // nativeTokenED: string
  nativeTokenCoingeckoId: string | null
  nativeTokenLogoUrl: string | null
  accountFormat: string | null
  subscanUrl: string | null
  rpcs: { url: string }[]
}

export interface ChainsMessages {
  // chain message signatures
  "pri(chains.subscribe)": [null, boolean, boolean]
  "pri(chains.upsert)": [RequestUpsertCustomChain, boolean]
  "pri(chains.remove)": [RequestIdOnly, boolean]
  "pri(chains.reset)": [RequestIdOnly, boolean]
  "pri(chains.generateQr.addNetworkSpecs)": [RequestChainGenerateQrAddNetworkSpecs, HexString]
  "pri(chains.generateQr.updateNetworkMetadata)": [
    RequestChainGenerateQrUpdateNetworkMetadata,
    HexString
  ]
}
