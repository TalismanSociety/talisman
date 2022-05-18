import type { MetadataDef } from "@polkadot/extension-inject/types"
import { IndexedDBStorageProvider } from "@core/libs/IndexedDBStore"

class MetadataStore extends IndexedDBStorageProvider<"metadata", MetadataDef> {}

const metadataStore = new MetadataStore("metadata", "genesisHash")

export default metadataStore
