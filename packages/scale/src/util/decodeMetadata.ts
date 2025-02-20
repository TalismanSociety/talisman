import { V14, V15 } from "@polkadot-api/substrate-bindings"

import { metadata as scaleMetadata } from "../papito"
import { getMetadataVersion } from "./getMetadataVersion"

export const decodeMetadata = (
  metadataRpc: string,
): { metadataVersion: number } & (
  | { metadata: V15; tag: "v15" }
  | { metadata: V14; tag: "v14" }
  | { metadata?: undefined; tag?: undefined }
) => {
  const metadataVersion = getMetadataVersion(metadataRpc)
  if (metadataVersion !== 15 && metadataVersion !== 14) return { metadataVersion }

  const decoded = scaleMetadata.dec(metadataRpc)
  if (decoded.metadata.tag === "v15")
    return { metadataVersion, metadata: decoded.metadata.value, tag: decoded.metadata.tag }
  if (decoded.metadata.tag === "v14")
    return { metadataVersion, metadata: decoded.metadata.value, tag: decoded.metadata.tag }

  return { metadataVersion }
}
