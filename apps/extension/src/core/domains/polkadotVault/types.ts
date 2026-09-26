import type { HexString } from "@talismn/util"

import type { SignerPayloadGenesisHash } from "../signing/types"

export type RequestPolkadotVaultGenerateQrAddNetworkSpecs = {
  genesisHash: SignerPayloadGenesisHash // ussing the imported type from above enables us to stay up to date with upstream changes
}

export type RequestPolkadotVaultGenerateQrUpdateNetworkMetadata = {
  genesisHash: SignerPayloadGenesisHash
  specVersion?: number
}

export interface PolkadotVaultMessages {
  "pri(polkadotVault.generateQr.addNetworkSpecs)": [
    RequestPolkadotVaultGenerateQrAddNetworkSpecs,
    HexString,
  ]
  "pri(polkadotVault.generateQr.updateNetworkMetadata)": [
    RequestPolkadotVaultGenerateQrUpdateNetworkMetadata,
    HexString,
  ]
}
