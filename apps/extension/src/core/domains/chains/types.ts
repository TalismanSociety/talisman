import { SignerPayloadGenesisHash } from "@core/domains/signing/types"
import { HexString } from "@polkadot/util/types"

export type { Chain, ChainId, ChainList, SubstrateRpc } from "@talismn/chaindata-provider"

export type RequestChainGenerateQrAddNetworkSpecs = {
  genesisHash: SignerPayloadGenesisHash // ussing the imported type from above enables us to stay up to date with upstream changes
}

export type RequestChainGenerateQrUpdateNetworkMetadata = {
  genesisHash: SignerPayloadGenesisHash
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
