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

export class TalismanDatabase extends Dexie {
  chains!: Dexie.Table<Chain, ChainId>
  evmNetworks!: Dexie.Table<EvmNetwork | CustomEvmNetwork, EvmNetworkId>
  tokens!: Dexie.Table<Token, TokenId>
  balances!: Dexie.Table<BalanceStorage, string>

  constructor() {
    super("Talisman")
    this.version(1).stores({
      chains: "id, genesisHash, name, nativeToken, tokens, evmNetworks",
      evmNetworks: "id, name, nativeToken, tokens, substrateChain",
      tokens: "id, type, symbol, coingeckoId, contractAddress, chain, evmNetwork",
      balances: "id, pallet, address, chainId, evmNetworkId, tokenId",
    })
  }
}

export const db = new TalismanDatabase()
