import { BalanceStorage } from "@core/domains/balances/types"
import { Chain, ChainId } from "@core/domains/chains/types"
import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { Token, TokenId } from "@core/domains/tokens/types"
import { MetadataDef } from "@core/inject/types"
import { Dexie } from "dexie"

export class TalismanDatabase extends Dexie {
  chains!: Dexie.Table<Chain, ChainId>
  evmNetworks!: Dexie.Table<EvmNetwork | CustomEvmNetwork, EvmNetworkId>
  tokens!: Dexie.Table<Token, TokenId>
  balances!: Dexie.Table<BalanceStorage, string>
  metadata!: Dexie.Table<MetadataDef, string>

  constructor() {
    super("Talisman")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(4).stores({
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
      metadataRpc: null, // delete legacy table
      chainMetadataRpc: null, // delete legacy table
    })

    // init code moved to Extension.ts to prevent frontend build to have metadataInit
  }
}

export const db = new TalismanDatabase()
