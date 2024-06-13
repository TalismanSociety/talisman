import { TypeRegistry } from "@polkadot/types"
import { hexToNumber, u8aToHex } from "@polkadot/util"
import { base64Decode } from "@polkadot/util-crypto"
import {
  get_metadata_digest,
  get_short_metadata_from_tx_blob,
} from "@talismn/metadata-shortener-wasm"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import useToken from "@ui/hooks/useToken"
import { SignerPayloadJSON } from "extension-core"
import { log } from "extension-shared"

const trimPrefix = (str: string) => (str.startsWith("0x") ? str.slice(2) : str)

export const useLedgerPolkadotPayload = (payload: SignerPayloadJSON | null) => {
  const chain = useChainByGenesisHash(payload?.genesisHash)
  const token = useToken(chain?.nativeToken?.id)

  return useQuery({
    queryKey: ["useLedgerPolkadotPayload", payload, chain?.id, token?.id],
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
        if (metadata15.version !== 15) throw new Error("Invalid metadata version")
        registry.setMetadata(metadata15, payload.signedExtensions)

        // check if runtime supports CheckMetadataHash
        const hasCheckMetadataHash = metadata15.asV15.extrinsic.signedExtensions.some(
          (ext) => ext.identifier.toString() === "CheckMetadataHash"
        )

        const metadataHash = get_metadata_digest(
          trimPrefix(hexMetadataRpc),
          token.symbol,
          token.decimals,
          chain.prefix ?? 42,
          specName,
          specVersion
        )

        const payloadWithMetadataHash = {
          ...payload,
          metadataHash: `0x${metadataHash}`,
          mode: 1,
        } as SignerPayloadJSON

        const extPayload = registry.createType("ExtrinsicPayload", payloadWithMetadataHash)
        const hexPayload = u8aToHex(extPayload.toU8a(true))

        const txMetadata = get_short_metadata_from_tx_blob(
          trimPrefix(hexMetadataRpc),
          trimPrefix(hexPayload),
          token.symbol,
          token.decimals,
          chain.prefix ?? 42,
          specName,
          specVersion
        )

        return {
          txMetadata,
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
  })
}
