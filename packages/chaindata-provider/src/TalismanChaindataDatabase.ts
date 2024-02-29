import { Dexie } from "dexie"

import {
  Chain,
  ChainId,
  CustomChain,
  CustomEvmNetwork,
  EvmNetwork,
  EvmNetworkId,
  Token,
  TokenId,
} from "./types"
import { upgradeRemoveSymbolFromNativeTokenId } from "./upgrades"
import { upgradeAddIsDefaultToExistingChains } from "./upgrades/2024-01-25-upgradeAddIsDefaultToExistingChains"

export class TalismanChaindataDatabase extends Dexie {
  chains!: Dexie.Table<Chain | CustomChain, ChainId>
  evmNetworks!: Dexie.Table<EvmNetwork | CustomEvmNetwork, EvmNetworkId>
  tokens!: Dexie.Table<Token, TokenId>

  constructor() {
    super("TalismanChaindata")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(2)
      .stores({
        // You only need to specify properties that you wish to index.
        // The object store will allow any properties on your stored objects but you can only query them by indexed properties
        // https://dexie.org/docs/API-Reference#declare-database
        //
        // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
        // https://dexie.org/docs/Version/Version.stores()#warning
        chains: "id, genesisHash, name",
        evmNetworks: "id, name",
        tokens: "id, type, symbol, coingeckoId, dcentName, contractAddress",
      })
      .upgrade(upgradeRemoveSymbolFromNativeTokenId)
      .upgrade(upgradeAddIsDefaultToExistingChains)
  }
}

export const db = new TalismanChaindataDatabase()
