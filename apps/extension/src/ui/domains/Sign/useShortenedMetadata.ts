import { Metadata, TypeRegistry } from "@polkadot/types"
import { hexToNumber, isHex, u8aToHex } from "@polkadot/util"
import { base64Decode } from "@polkadot/util-crypto"
import { get_short_metadata_from_tx_blob } from "@talismn/metadata-shortener-wasm"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import useToken from "@ui/hooks/useToken"
import { SignerPayloadJSON } from "extension-core"
import { log } from "extension-shared"

const trimPrefix = (str: string) => (str.startsWith("0x") ? str.slice(2) : str)

export const useShortenedMetadata = (payload: SignerPayloadJSON | null) => {
  const chain = useChainByGenesisHash(payload?.genesisHash)
  const token = useToken(chain?.nativeToken?.id)

  return useQuery({
    queryKey: ["useShortenedMetadata", payload, chain?.id, token?.id],
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

        // check that it's valid V15
        const registry = new TypeRegistry()
        const metadata = new Metadata(registry, metadataRpc)
        if (metadata.version !== 15) throw new Error("Invalid metadata version")
        const hexMetadataRpc = u8aToHex(metadataRpc)

        registry.setSignedExtensions(payload.signedExtensions)
        const extPayload = registry.createType("ExtrinsicPayload", payload, {
          version: payload.version,
        })
        const hexPayload = u8aToHex(extPayload.toU8a(true))

        const shortened = get_short_metadata_from_tx_blob(
          trimPrefix(hexMetadataRpc),
          trimPrefix(hexPayload),
          token.symbol,
          token.decimals,
          chain.prefix ?? 42,
          specName,
          specVersion
        )

        // if returned value is not a hex string, it's an error message
        if (!isHex("0x" + shortened)) throw new Error(shortened)

        return shortened
      } catch (error) {
        log.error("Failed to get shortened metadata", { error })
        throw error
      }
    },
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
