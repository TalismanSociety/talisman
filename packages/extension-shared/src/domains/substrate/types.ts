import type { MetadataDef as PjsMetadataDef } from "@polkadot/extension-inject/types"

export interface TalismanMetadataDef extends PjsMetadataDef {
  metadataRpc?: string
}
