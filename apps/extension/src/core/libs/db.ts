import { BalanceStorage } from "@core/domains/balances/types"
import { Chain, ChainId } from "@core/domains/chains/types"
import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import metadataInit from "@core/domains/metadata/_metadataInit"
import { Token, TokenId } from "@core/domains/tokens/types"
import { MetadataDef } from "@core/inject/types"
import { RuntimeVersion } from "@polkadot/types/interfaces"
import { Dexie } from "dexie"
import Browser from "webextension-polyfill"

export class TalismanDatabase extends Dexie {
  chains!: Dexie.Table<Chain, ChainId>
  evmNetworks!: Dexie.Table<EvmNetwork | CustomEvmNetwork, EvmNetworkId>
  tokens!: Dexie.Table<Token, TokenId>
  balances!: Dexie.Table<BalanceStorage, string>
  metadata!: Dexie.Table<MetadataDef, string>
  chainMetadataRpc!: Dexie.Table<ChainMetadataRpc, string>

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
      balances: "id, source, address, chainId, evmNetworkId, tokenId",
      metadata: "genesisHash",
      metadataRpc: null,
      chainMetadataRpc: "chainId",
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
  cacheKey: string
  metadataRpc: `0x${string}`
  runtimeVersion: RuntimeVersion
}

export const db = new TalismanDatabase()
