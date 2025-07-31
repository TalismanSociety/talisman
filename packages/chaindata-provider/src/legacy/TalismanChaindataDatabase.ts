import { Dexie } from "dexie"

import { Token, TokenId } from "../chaindata"
import { upgradeAddIsDefaultToExistingChains } from "../upgrades/2024-01-25-upgradeAddIsDefaultToExistingChains"
import { upgradeRemoveSymbolFromNativeTokenId } from "../upgrades/2024-01-25-upgradeRemoveSymbolFromNativeTokenId"
import { LegacyChain, LegacyChainId, LegacyCustomChain } from "./Chain"
import { LegacyCustomEvmNetwork, LegacyEvmNetwork, LegacyEvmNetworkId } from "./EvmNetwork"

class TalismanChaindataDatabase extends Dexie {
  chains!: Dexie.Table<LegacyChain | LegacyCustomChain, LegacyChainId>
  evmNetworks!: Dexie.Table<LegacyEvmNetwork | LegacyCustomEvmNetwork, LegacyEvmNetworkId>
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

/** @deprecated */
export const getChaindataDbV3 = () => new TalismanChaindataDatabase()
