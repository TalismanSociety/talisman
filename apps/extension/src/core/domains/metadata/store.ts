import { IndexedDBStorageProvider } from "@core/libs/IndexedDBStore"

class MetadataStore extends IndexedDBStorageProvider<"metadata"> {}

const metadataStore = new MetadataStore("metadata", "genesisHash")

export default metadataStore
