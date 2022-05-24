import { IndexedDBStorageProvider } from "@core/libs/IndexedDBStore"

class EvmAssetStore extends IndexedDBStorageProvider<"evmAssets"> {}

export const evmAssetStore = new EvmAssetStore("evmAssets", "address")
