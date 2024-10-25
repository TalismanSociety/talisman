import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { assert, hexToNumber, u8aToHex } from "@polkadot/util"
import { Chain, Token } from "@talismn/chaindata-provider"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { SignerPayloadJSON } from "extension-core"

import { log } from "@extension/shared"
import { useChainByGenesisHash, useToken } from "@ui/state"
import { getFrontendTypeRegistry } from "@ui/util/getFrontendTypeRegistry"

export const useSubstratePayloadMetadata = (payload: SignerPayloadJSON | null) => {
  const chain = useChainByGenesisHash(payload?.genesisHash)
  const token = useToken(chain?.nativeToken?.id)

  return useQuery({
    queryKey: ["useSubstratePayloadMetadata", payload, chain?.id, token?.id],
    queryFn: () => getSubstratePayloadMetadata({ payload, chain, token }),
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export const useSubstratePayloadMetadataSuspense = (payload: SignerPayloadJSON | null) => {
  const chain = useChainByGenesisHash(payload?.genesisHash)
  const token = useToken(chain?.nativeToken?.id)

  return useSuspenseQuery({
    queryKey: ["useSubstratePayloadMetadata", payload, chain?.id, token?.id],
    queryFn: () => getSubstratePayloadMetadata({ payload, chain, token }),
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

const getSubstratePayloadMetadata = async ({
  payload,
  chain,
  token,
}: {
  payload: SignerPayloadJSON | null
  chain: Chain | null | undefined
  token: Token | null | undefined
}) => {
  if (!payload || !chain || !token) return null

  try {
    const specVersion = hexToNumber(payload.specVersion)

    // metadata v15 is required by the shortener
    const { registry, metadataRpc } = await getFrontendTypeRegistry(
      chain.id,
      payload.specVersion,
      payload.blockHash,
      payload.signedExtensions
    )
    assert(metadataRpc, "Unable to get metadata rpc")

    // TODO try and avoid creating new metadata object
    const metadata = registry.createType("Metadata", metadataRpc)

    // check if runtime supports CheckMetadataHash
    const hasCheckMetadataHash =
      chain.hasCheckMetadataHash && // this can be toggled off from chaindata
      metadata.version >= 15 &&
      metadata.asLatest.extrinsic.signedExtensions.some(
        (ext) => ext.identifier.toString() === "CheckMetadataHash"
      )

    // it is not possible to generate a valid metadata hash for dev chains as they are missing symbol and decimals in their chain spec
    // this should be check using a system_properties rpc call but checking token details achieves the same thing
    const isDevChain = token.symbol === "Unit" && token.decimals === 0

    if (!hasCheckMetadataHash || isDevChain || !chain.specName)
      return {
        txMetadata: undefined,
        metadataHash: undefined,
        registry,
        payloadWithMetadataHash: payload,
        hasCheckMetadataHash,
      }

    const merkleizedMetadata = merkleizeMetadata(metadataRpc, {
      tokenSymbol: token.symbol,
      decimals: token.decimals,
      base58Prefix: registry.chainSS58 ?? 42,
      specName: chain.specName,
      specVersion,
    })
    const metadataHash = u8aToHex(merkleizedMetadata.digest())

    // payload can be modified only if withSignedTransaction is true
    const payloadWithMetadataHash = payload.withSignedTransaction
      ? ({
          ...payload,
          metadataHash,
          mode: 1,
        } as SignerPayloadJSON)
      : payload

    const extPayload = registry.createType("ExtrinsicPayload", payloadWithMetadataHash)
    const hexPayload = u8aToHex(extPayload.toU8a(true))

    const txMetadata = merkleizedMetadata.getProofForExtrinsicPayload(hexPayload)

    return {
      txMetadata: u8aToHex(txMetadata),
      metadataHash,
      registry,
      payloadWithMetadataHash,
      hasCheckMetadataHash,
    }
  } catch (error) {
    log.error("Failed to get shortened metadata", { error })
    throw error
  }
}
