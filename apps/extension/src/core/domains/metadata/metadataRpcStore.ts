import { IndexedDBStorageProvider } from "@core/libs/IndexedDBStore"

class MetadataRpcStore extends IndexedDBStorageProvider<"metadataRpc"> {}

export const metadataRpcStore = new MetadataRpcStore("metadataRpc", "chainId")
