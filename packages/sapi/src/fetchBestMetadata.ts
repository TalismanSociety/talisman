import { toHex } from "@polkadot-api/utils"
import { u32, Vector } from "scale-ts"

const MAGIC_NUMBER = 1635018093

// it's important to set a max because some chains also return high invalid version numbers in the metadata_versions list (ex on Polkadot, related to JAM?)
export const MAX_SUPPORTED_METADATA_VERSION = 15 // v16 sometimes outputs different metadata hashes, ignore v16 until that is fixed in PAPI

type RpcSendFunc = <T>(method: string, params: unknown[], isCacheable?: boolean) => Promise<T>

/**
 * Fetches the highest supported version of metadata from the chain.
 *
 * @param rpcSend
 * @returns hex-encoded metadata starting with the magic number
 */
export const fetchBestMetadata = async (
  rpcSend: RpcSendFunc,
  allowLegacyFallback?: boolean,
): Promise<`0x${string}`> => {
  try {
    // fetch available versions of metadata
    const metadataVersions = await rpcSend<string>(
      "state_call",
      ["Metadata_metadata_versions", "0x"],
      true,
    )
    const availableVersions = Vector(u32).dec(metadataVersions)
    const bestVersion = Math.max(
      ...availableVersions.filter((v) => v <= MAX_SUPPORTED_METADATA_VERSION),
    )

    const metadata = await rpcSend<`0x${string}`>(
      "state_call",
      ["Metadata_metadata_at_version", toHex(u32.enc(bestVersion))],
      true,
    )

    return normalizeMetadata(metadata)
  } catch (cause) {
    // if the chain doesnt support the Metadata pallet, fallback to legacy rpc provided metadata (V14)
    const message = (cause as { message?: string })?.message
    if (
      allowLegacyFallback ||
      message?.includes("is not found") || // ex: crust standalone
      message?.includes("Module doesn't have export Metadata_metadata_versions") || // ex: 3DPass
      message?.includes("Exported method Metadata_metadata_versions is not found") || // ex: sora-polkadot & sora-standalone
      message?.includes("Execution, MethodNotFound, Metadata_metadata_versions") // ex: stafi
    ) {
      return (await rpcSend("state_getMetadata", [], true)) as `0x${string}`
    }

    // otherwise throw so it can be handled by the caller
    throw new Error("Failed to fetch metadata", { cause })
  }
}

/**
 * Removes everything before the magic number in the metadata.
 * This ensures Opaque metadata is usable by pjs
 */
const normalizeMetadata = (metadata: `0x${string}`): `0x${string}` => {
  const hexMagicNumber = toHex(u32.enc(MAGIC_NUMBER)).slice(2)

  const magicNumberIndex = metadata.indexOf(hexMagicNumber)
  if (magicNumberIndex === -1) throw new Error("Invalid metadata format: magic number not found")

  return `0x${metadata.slice(magicNumberIndex)}` as `0x${string}`
}
