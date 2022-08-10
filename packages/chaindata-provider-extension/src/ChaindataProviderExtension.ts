import {
  Chain,
  ChainId,
  ChaindataChainProvider,
  ChaindataEvmNetworkProvider,
  ChaindataProvider,
  ChaindataTokenProvider,
  EvmNetwork,
  EvmNetworkId,
  SubstrateRpc,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"

import { TalismanChaindataDatabase } from "./TalismanChaindataDatabase"

export class ChaindataProviderExtension implements ChaindataProvider {
  #db: TalismanChaindataDatabase

  constructor() {
    this.#db = new TalismanChaindataDatabase()
  }

  async getChain(chainId: string): Promise<Chain | null> {
    return (await this.#db.chains.get(chainId)) || null
  }

  async getEvmNetwork(evmNetworkId: number): Promise<EvmNetwork | null> {
    return (await this.#db.evmNetworks.get(evmNetworkId)) || null
  }

  async getToken(tokenId: string): Promise<Token | null> {
    return (await this.#db.tokens.get(tokenId)) || null
  }
}
