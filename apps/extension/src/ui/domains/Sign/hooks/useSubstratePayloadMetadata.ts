import { log } from "@common/log"
import { getMetadataRpcFromDef } from "@core/domains/metadata/helpers"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { getPjsTxHelper } from "@polkadot-api/tx-utils"
import { mergeUint8 } from "@polkadot-api/utils"
import { type DotNetwork, isNetworkDot, type Token } from "@talismn/chaindata-provider"
import { getScaleApi } from "@talismn/sapi"
import { decAnyMetadata, unifyMetadata } from "@talismn/scale"
import { assert, hexToNumber, u8aToHex } from "@talismn/util"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useNetworkByGenesisHash, useToken } from "@ui/state/chaindata"

export const useSubstratePayloadMetadata = (payload: SignerPayloadJSON | null) => {
  const network = useNetworkByGenesisHash(payload?.genesisHash)
  const token = useToken(network?.nativeTokenId)

  return useQuery({
    queryKey: ["useSubstratePayloadMetadata", payload, network?.id, token?.id],
    queryFn: () => getSubstratePayloadMetadata({ payload, network, token }),
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export const useSubstratePayloadMetadataSuspense = (payload: SignerPayloadJSON | null) => {
  const network = useNetworkByGenesisHash(payload?.genesisHash)
  const token = useToken(network?.nativeTokenId)

  return useSuspenseQuery({
    queryKey: ["useSubstratePayloadMetadata", payload, network?.id, token?.id],
    queryFn: () => getSubstratePayloadMetadata({ payload, network, token }),
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

const getSubstratePayloadMetadata = async ({
  payload,
  network,
  token,
}: {
  payload: SignerPayloadJSON | null
  network: DotNetwork | null | undefined
  token: Token | null | undefined
}) => {
  if (!payload || !token || !isNetworkDot(network)) return null

  try {
    const specVersion = hexToNumber(payload.specVersion)

    // metadata must be loaded by backend, this leverages its metadata cache
    // metadata v15 is required by the shortener
    const metadataDef = await api.subChainMetadata(payload.genesisHash, specVersion)
    const metadataRpc = getMetadataRpcFromDef(metadataDef)
    assert(metadataRpc, "Unable to get metadata rpc")

    const metadata = unifyMetadata(decAnyMetadata(metadataRpc))

    // generate the sapi object if possible
    const sapi =
      metadata.version > 14
        ? getScaleApi(
            {
              chainId: network.id,
              send: (...args) => api.subSend(network.id, ...args),
              submit: api.subSubmit,
              submitWithBittensorMevShield: api.subSubmitWithBittensorMevShield,
            },
            metadataRpc,
            token,
            network.hasCheckMetadataHash,
            network.signedExtensions,
            network.registryTypes
          )
        : null

    // check if runtime supports CheckMetadataHash
    const hasCheckMetadataHash =
      network.hasCheckMetadataHash && // this can be toggled off from chaindata
      metadata.extrinsic.signedExtensions[0]?.some((ext) => ext.identifier === "CheckMetadataHash")

    // it is not possible to generate a valid metadata hash for dev chains as they are missing symbol and decimals in their chain spec
    // this should be check using a system_properties rpc call but checking token details achieves the same thing
    const isDevChain = token.symbol === "Unit" && token.decimals === 0

    if (!hasCheckMetadataHash || isDevChain || !network.specName)
      return {
        txMetadata: undefined,
        metadataHash: undefined,
        metadataRpc,
        payloadWithMetadataHash: payload,
        hasCheckMetadataHash,
        sapi,
      }

    const metadataHashInputs = {
      tokenSymbol: token.symbol,
      decimals: token.decimals,
      base58Prefix: sapi?.base58Prefix ?? network.prefix,
      specName: network.specName,
      specVersion,
    }

    const merkleizedMetadata = merkleizeMetadata(metadataRpc, metadataHashInputs)
    const metadataHash = u8aToHex(merkleizedMetadata.digest())
    log.log("metadataHash", metadataHash, metadataHashInputs)

    // payload can be modified only if withSignedTransaction is true
    const payloadWithMetadataHash = payload.withSignedTransaction
      ? ({
          ...payload,
          metadataHash,
          mode: 1,
        } as SignerPayloadJSON)
      : payload

    const { callData, extra, additionalSigned } =
      getPjsTxHelper(metadataRpc)(payloadWithMetadataHash)
    const barePayload = mergeUint8([callData, extra, additionalSigned])

    const txMetadata = merkleizedMetadata.getProofForExtrinsicPayload(barePayload)

    return {
      txMetadata: u8aToHex(txMetadata),
      metadataHash,
      metadataRpc,
      payloadWithMetadataHash,
      hasCheckMetadataHash,
      sapi,
    }
  } catch (error) {
    log.error("Failed to get shortened metadata", { error })
    throw error
  }
}
