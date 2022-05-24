import { IndexedDBStorageProvider } from "@core/libs/IndexedDBStore"

const metadataStore = new IndexedDBStorageProvider<"metadata">("metadata", "genesisHash")

export default metadataStore
