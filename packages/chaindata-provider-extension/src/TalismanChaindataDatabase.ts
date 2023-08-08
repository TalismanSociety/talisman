import {
  Chain,
  ChainId,
  CustomChain,
  CustomEvmNetwork,
  EvmNetwork,
  EvmNetworkId,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { Dexie } from "dexie"

export class TalismanChaindataDatabase extends Dexie {
  chains!: Dexie.Table<Chain | CustomChain, ChainId>
  evmNetworks!: Dexie.Table<EvmNetwork | CustomEvmNetwork, EvmNetworkId>
  tokens!: Dexie.Table<Token, TokenId>

  constructor() {
    super("TalismanChaindata")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(1).stores({
      // You only need to specify properties that you wish to index.
      // The object store will allow any properties on your stored objects but you can only query them by indexed properties
      // https://dexie.org/docs/API-Reference#declare-database
      //
      // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
      // https://dexie.org/docs/Version/Version.stores()#warning
      chains: "id, genesisHash, name, nativeToken, tokens, evmNetworks",
      evmNetworks: "id, name, nativeToken, tokens, substrateChain",
      tokens: "id, type, symbol, coingeckoId, dcentName, contractAddress, chain, evmNetwork",
    })

    // this.on("ready", async () => {})
  }
}

export const db = new TalismanChaindataDatabase()
