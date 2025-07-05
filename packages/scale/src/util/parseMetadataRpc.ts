import { getDynamicBuilder, getLookupFn } from "@polkadot-api/metadata-builders"
import { decAnyMetadata, unifyMetadata } from "@polkadot-api/substrate-bindings"

export const parseMetadataRpc = (metadataRpc: `0x${string}`) => {
  const metadata = decAnyMetadata(metadataRpc)
  const unifiedMetadata = unifyMetadata(metadata)
  const lookupFn = getLookupFn(unifiedMetadata)
  const builder = getDynamicBuilder(lookupFn)

  return { metadata, unifiedMetadata, lookupFn, builder }
}
