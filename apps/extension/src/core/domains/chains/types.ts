import { HexString } from "@polkadot/util/types"

export type { Chain, ChainId, ChainList, SubstrateRpc } from "@talismn/chaindata-provider"

export type RequestChainGenerateQrAddNetworkSpecs = {
  genesisHash: string
}

export type RequestChainGenerateQrUpdateNetworkMetadata = {
  genesisHash: string
  specVersion: number
}

export interface ChainsMessages {
  // chain message signatures
  "pri(chains.subscribe)": [null, boolean, boolean]
  "pri(chains.generateQr.addNetworkSpecs)": [RequestChainGenerateQrAddNetworkSpecs, HexString]
  "pri(chains.generateQr.updateNetworkMetadata)": [
    RequestChainGenerateQrUpdateNetworkMetadata,
    HexString
  ]
}
