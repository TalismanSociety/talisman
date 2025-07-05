import { getDynamicBuilder, getLookupFn } from "@polkadot-api/metadata-builders"
import { decAnyMetadata, unifyMetadata } from "@polkadot-api/substrate-bindings"

import log from "../log"

export const parseMetadataRpc = (metadataRpc: `0x${string}`) => {
  const start = performance.now()
  const metadata = decAnyMetadata(metadataRpc)
  const unifiedMetadata = unifyMetadata(metadata)
  const lookupFn = getLookupFn(unifiedMetadata)
  const builder = getDynamicBuilder(lookupFn)
  log.debug(`parseMetadataRpc executed in ${(performance.now() - start).toFixed(2)}ms`)

  return { metadata, unifiedMetadata, lookupFn, builder }
}
