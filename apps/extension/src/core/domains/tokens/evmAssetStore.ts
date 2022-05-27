import { IndexedDBStorageProvider } from "@core/libs/IndexedDBStore"

export const evmAssetStore = new IndexedDBStorageProvider<"evmAssets">("evmAssets", "id")
