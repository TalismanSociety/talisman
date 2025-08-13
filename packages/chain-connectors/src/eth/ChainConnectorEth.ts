import {
  EthNetworkId,
  IChaindataNetworkProvider,
  IChaindataTokenProvider,
} from "@talismn/chaindata-provider"
import { Account, PublicClient, WalletClient } from "viem"

import { clearPublicClientCache, getEvmNetworkPublicClient } from "./getEvmNetworkPublicClient"
import { getEvmNetworkWalletClient } from "./getEvmNetworkWalletClient"
import { IChainConnectorEth } from "./IChainConnectorEth"

export class ChainConnectorEth implements IChainConnectorEth {
  #chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider

  constructor(chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider) {
    this.#chaindataProvider = chaindataProvider
  }

  async getPublicClientForEvmNetwork(evmNetworkId: EthNetworkId): Promise<PublicClient | null> {
    const network = await this.#chaindataProvider.getNetworkById(evmNetworkId, "ethereum")
    if (!network) return null

    return getEvmNetworkPublicClient(network)
  }

  async getWalletClientForEvmNetwork(
    evmNetworkId: EthNetworkId,
    account?: `0x${string}` | Account,
  ): Promise<WalletClient | null> {
    const network = await this.#chaindataProvider.getNetworkById(evmNetworkId, "ethereum")
    if (!network) return null

    return getEvmNetworkWalletClient(network, { account })
  }

  public clearRpcProvidersCache(evmNetworkId?: EthNetworkId) {
    clearPublicClientCache(evmNetworkId)
  }
}
