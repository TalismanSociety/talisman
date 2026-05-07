import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { toHex } from "@polkadot-api/utils"

import log from "../log"
import { encodeExtrinsicPayload } from "./encodeExtrinsic"
import type { SignerPayloadJSON } from "./signedPayloadTypes"
import type { Chain, ChainInfo } from "./types"

export const getPayloadWithMetadataHash = (
  chain: Chain,
  chainInfo: ChainInfo,
  payload: SignerPayloadJSON
): { payload: SignerPayloadJSON; txMetadata?: Uint8Array } => {
  if (!chain.hasCheckMetadataHash || !payload.signedExtensions.includes("CheckMetadataHash"))
    return {
      payload,
      txMetadata: undefined,
    }

  try {
    const { decimals, symbol: tokenSymbol } = chain.token
    const { base58Prefix, specName, specVersion } = chainInfo
    const metadataHashInputs = { tokenSymbol, decimals, base58Prefix, specName, specVersion }

    // since ultimately this needs a V15 object, would be nice if this accepted one directly as input
    const merkleizedMetadata = merkleizeMetadata(chain.hexMetadata, metadataHashInputs)
    const metadataHash = toHex(merkleizedMetadata.digest()) as `0x${string}`
    log.log("metadataHash", metadataHash, metadataHashInputs)

    const payloadWithMetadataHash: SignerPayloadJSON = {
      ...payload,
      mode: 1,
      metadataHash,
      withSignedTransaction: true,
    }

    const barePayload = encodeExtrinsicPayload(payloadWithMetadataHash)
    const txMetadata = merkleizedMetadata.getProofForExtrinsicPayload(barePayload)

    return {
      payload: payloadWithMetadataHash,
      txMetadata,
    }
  } catch (err) {
    log.error("Failed to get shortened metadata", { error: err })
    return {
      payload,
      txMetadata: undefined,
    }
  }
}
