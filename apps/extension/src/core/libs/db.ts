import metadataInit from "@core/domains/metadata/_metadataInit"
import { MetadataDef } from "@core/inject/types"
import {
  BalanceStorage,
  Chain,
  ChainId,
  CustomEvmNetwork,
  EvmNetwork,
  EvmNetworkId,
  Token,
  TokenId,
} from "@core/types"
import { Dexie } from "dexie"
import Browser from "webextension-polyfill"

export class TalismanDatabase extends Dexie {
  chains!: Dexie.Table<Chain, ChainId>
  evmNetworks!: Dexie.Table<EvmNetwork | CustomEvmNetwork, EvmNetworkId>
  tokens!: Dexie.Table<Token, TokenId>
  balances!: Dexie.Table<BalanceStorage, string>
  metadata!: Dexie.Table<MetadataDef, string>
  metadataRpc!: Dexie.Table<ChainMetadataRpc, string>
  smoldotDbContent!: Dexie.Table<SmoldotDbContent, ChainId>

  constructor() {
    super("Talisman")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(3).stores({
      // You only need to specify properties that you wish to index.
      // The object store will allow any properties on your stored objects but you can only query them by indexed properties
      // https://dexie.org/docs/API-Reference#declare-database
      //
      // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
      // https://dexie.org/docs/Version/Version.stores()#warning
      chains: "id, genesisHash, name, nativeToken, tokens, evmNetworks",
      evmNetworks: "id, name, nativeToken, tokens, substrateChain",
      tokens: "id, type, symbol, coingeckoId, contractAddress, chain, evmNetwork",
      balances: "id, pallet, address, chainId, evmNetworkId, tokenId",
      metadata: "genesisHash",
      metadataRpc: "chainId",
      smoldotDbContent: "chainId",
    })

    this.on("ready", async () => {
      // if store has no metadata yet
      if ((await this.metadata.count()) < 1) {
        // delete old localstorage-managed 'db'
        Browser.storage.local.remove([
          "chains",
          "ethereumNetworks",
          "tokens",
          "balances",
          "metadata",
        ])

        // delete old idb-managed metadata+metadataRpc db
        indexedDB.deleteDatabase("talisman")

        // add initial metadata
        this.metadata.bulkAdd(metadataInit)
      }
    })
  }
}

export type ChainMetadataRpc = {
  chainId: string
  specVersion: number
  metadataRpc: `0x${string}`
}

export type SmoldotDbContent = {
  chainId: string
  databaseContent: string
}

export const db = new TalismanDatabase()
