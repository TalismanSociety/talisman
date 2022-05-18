import { ChainMetadataRpc } from "@core/libs/db"
import { IndexedDBStorageProvider } from "@core/libs/IndexedDBStore"

class MetadataRpcStore extends IndexedDBStorageProvider<"metadataRpc", ChainMetadataRpc> {}

export const metadataRpcStore = new MetadataRpcStore("metadataRpc", "chainId")
