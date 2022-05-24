import metadataInit from "@core/domains/metadata/_metadataInit"
import { MetadataDef } from "@core/inject/types"
import { IDBPTransaction, openDB } from "idb"
import range from "lodash/range"
import Browser from "webextension-polyfill"

export type ChainMetadataRpc = {
  chainId: string
  specVersion: number
  metadataRpc: `0x${string}`
}

export type EvmAssetInfo = {
  type: "ERC20" // May be expanded to other types of asset in future
  chainId: string
  address: string // The address that the token is at.
  symbol: string // A ticker symbol or shorthand, up to 5 chars.
  decimals: number // The number of decimals in the token
  image?: string
}

export interface TalismanSchema {
  // Add your store name and definition here
  metadata: { key: string; value: MetadataDef }
  metadataRpc: { key: string; value: ChainMetadataRpc }
  evmAssets: { key: string; value: EvmAssetInfo }
}

type MigrationFunction = (
  tx: IDBPTransaction<TalismanSchema, keyof TalismanSchema, "versionchange">
) => void

type IndexedStoreDef<K extends keyof TalismanSchema> = {
  storeName: K
  keyPath: keyof TalismanSchema[K]["value"]
  initialData: TalismanSchema[K]["value"][]
  migrations: { [version: number]: MigrationFunction }
}

const metadataStoreDef: IndexedStoreDef<"metadata"> = {
  storeName: "metadata",
  keyPath: "genesisHash",
  initialData: metadataInit,
  migrations: {
    1: () => Browser.storage.local.remove("metadata"),
  },
}

const metadataRpcStoreDef: IndexedStoreDef<"metadataRpc"> = {
  storeName: "metadataRpc",
  keyPath: "chainId",
  initialData: [],
  migrations: {},
}

const storeDefs = [metadataStoreDef, metadataRpcStoreDef]

// Make sure to increment this if you add a table or it won't be created !
const DB_VERSION = 2

const db = openDB<TalismanSchema>("talisman", DB_VERSION, {
  upgrade(db, oldVersion, newVersion, transaction) {
    for (let { storeName, keyPath, initialData, migrations } of storeDefs) {
      if (!db.objectStoreNames.contains(storeName))
        transaction.db.createObjectStore(storeName, { keyPath })

      if (newVersion !== null) {
        const allMigrations: MigrationFunction[] = []

        if (oldVersion === 0)
          allMigrations.push((tx) =>
            initialData.forEach((item) => tx.objectStore(storeName).add(item))
          )

        // then populate a set of other intermediate migrations
        range(oldVersion, newVersion + 1)
          .filter((index) => migrations[index])
          .forEach((index) => allMigrations.push(migrations[index]))

        allMigrations.forEach((migration) => migration(transaction))
      }
    }
  },
})

export const waitDbReady = async () => db
