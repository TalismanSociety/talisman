import { log } from "@extension/shared"
import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { TypeRegistry } from "@polkadot/types"
import { hexToNumber, u8aToHex } from "@polkadot/util"
import { base64Decode } from "@polkadot/util-crypto"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import useToken from "@ui/hooks/useToken"
import { SignerPayloadJSON } from "extension-core"

export const useSubstratePayloadMetadata = (
  payload: SignerPayloadJSON | null,
  suspense = false,
) => {
  const chain = useChainByGenesisHash(payload?.genesisHash)
  const token = useToken(chain?.nativeToken?.id)

  return useQuery({
    queryKey: ["useSubstratePayloadMetadata", payload, chain?.id, token?.id],
    queryFn: async () => {
      if (!payload || !chain || !token) return null

      try {
        if (!chain.specName) throw new Error("Missing chain specName")

        const specVersion = hexToNumber(payload.specVersion)
        const [metadataDef, { specName }] = await Promise.all([
          api.subChainMetadata(payload.genesisHash, specVersion, payload.blockHash),
          api.subSend<{ specName: string }>(chain.id, "state_getRuntimeVersion", [], true),
        ])
        if (!metadataDef?.metadataRpc) throw new Error("Metadata unavailable")
        if (metadataDef.specVersion !== specVersion) throw new Error("Spec version mismatch")

        // decompress
        const metadataRpc = base64Decode(metadataDef.metadataRpc)

        // metadata v15 is required by the shortener
        const registry = new TypeRegistry()
        const hexMetadataRpc = u8aToHex(metadataRpc)
        const metadata15 = registry.createType("Metadata", hexMetadataRpc)
        registry.setMetadata(metadata15, payload.signedExtensions)

        // check if runtime supports CheckMetadataHash
        const hasCheckMetadataHash = metadata15.asV15.extrinsic.signedExtensions.some(
          (ext) => ext.identifier.toString() === "CheckMetadataHash",
        )

        if (!hasCheckMetadataHash)
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
          base58Prefix: chain.prefix ?? 42,
          specName,
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
    },
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    suspense,
  })
}
