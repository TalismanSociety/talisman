import { IndexedDBStorageProvider } from "@core/libs/IndexedDBStore"

export const metadataRpcStore = new IndexedDBStorageProvider<"metadataRpc">(
  "metadataRpc",
  "chainId"
)
