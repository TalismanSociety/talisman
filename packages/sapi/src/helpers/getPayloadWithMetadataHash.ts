import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { getPjsTxHelper } from "@polkadot-api/tx-utils"
import { mergeUint8, toHex } from "@polkadot-api/utils"
import { CUSTOM_SIGNED_EXTENSIONS } from "../customSignedExtensions"
import log from "../log"
import type { SignerPayloadJSON } from "../pjsInterop"
import type { Chain, ChainInfo } from "./types"

type MetadataHashTools = {
  merkleizedMetadata: ReturnType<typeof merkleizeMetadata>
  pjsTxHelper: ReturnType<typeof getPjsTxHelper>
}

const metadataHashToolsCache = new WeakMap<Chain, MetadataHashTools>()

const getMetadataHashTools = (chain: Chain, chainInfo: ChainInfo) => {
  const cached = metadataHashToolsCache.get(chain)
  if (cached) return cached

  const { decimals, symbol: tokenSymbol } = chain.token
  const { base58Prefix, specName, specVersion } = chainInfo
  const tools = {
    merkleizedMetadata: merkleizeMetadata(chain.hexMetadata, {
      tokenSymbol,
      decimals,
      base58Prefix,
      specName,
      specVersion,
    }),
    pjsTxHelper: getPjsTxHelper(chain.hexMetadata, CUSTOM_SIGNED_EXTENSIONS),
  }
  metadataHashToolsCache.set(chain, tools)
  return tools
}

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
    const { merkleizedMetadata, pjsTxHelper } = getMetadataHashTools(chain, chainInfo)
    const metadataHash = toHex(merkleizedMetadata.digest()) as `0x${string}`

    const payloadWithMetadataHash = {
      ...payload,
      mode: 1,
      metadataHash,
      withSignedTransaction: true,
    }

    const { callData, extra, additionalSigned } = pjsTxHelper(payloadWithMetadataHash)
    const barePayload = mergeUint8([callData, extra, additionalSigned])

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
