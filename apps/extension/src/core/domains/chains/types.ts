import { HexString } from "@polkadot/util/types"

export type { Chain, ChainId, ChainList, SubstrateRpc } from "@talismn/chaindata-provider"

export type RequestChainAddNetworkSpecsQr = {
  genesisHash: string
}

export type RequestChainUpdateNetworkMetadataQr = {
  genesisHash: string
  specVersion: number
}

export interface ChainsMessages {
  // chain message signatures
  "pri(chains.subscribe)": [null, boolean, boolean]
  "pri(chains.addNetworkSpecsQr)": [RequestChainAddNetworkSpecsQr, HexString]
  "pri(chains.updateNetworkMetadataQr)": [RequestChainUpdateNetworkMetadataQr, HexString]
}
