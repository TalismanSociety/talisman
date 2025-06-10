import { toHex } from "@polkadot-api/utils"
import { u32, Vector } from "scale-ts"

import log from "./log"

const MAGIC_NUMBER = 1635018093

// it's important to set a max because some chains also return high invalid version numbers in the metadata_versions list (ex on Polkadot, related to JAM?)
const MAX_SUPPORTED_METADATA_VERSION = 16

type RpcSendFunc = <T>(method: string, params: unknown[], isCacheable?: boolean) => Promise<T>

/**
 * Fetches the highest supported version of metadata from the chain.
 *
 * @param rpcSend
 * @returns hex-encoded metadata starting with the magic number
 */
export const fetchBestMetadata = async (rpcSend: RpcSendFunc): Promise<`0x${string}`> => {
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
  } catch (err) {
    log.warn("Failed to fetch metadata via runtime call", err)
    // fallback to legacy rpc provided metadata (V14)
    return (await rpcSend("state_getMetadata", [], true)) as `0x${string}`
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
