import {
  EvmNetworkId,
  IChaindataEvmNetworkProvider,
  IChaindataTokenProvider,
} from "@talismn/chaindata-provider"
import { Account, PublicClient, WalletClient } from "viem"

import { clearPublicClientCache, getEvmNetworkPublicClient } from "./getEvmNetworkPublicClient"
import { getEvmNetworkWalletClient } from "./getEvmNetworkWalletClient"

export class ChainConnectorEvm {
  #chaindataProvider: IChaindataEvmNetworkProvider & IChaindataTokenProvider

  constructor(chaindataProvider: IChaindataEvmNetworkProvider & IChaindataTokenProvider) {
    this.#chaindataProvider = chaindataProvider
  }

  async getPublicClientForEvmNetwork(evmNetworkId: EvmNetworkId): Promise<PublicClient | null> {
    const network = await this.#chaindataProvider.evmNetworkById(evmNetworkId)
    if (!network?.nativeTokenId) return null

    const nativeToken = await this.#chaindataProvider.tokenById(network.nativeTokenId)

    return getEvmNetworkPublicClient(network, nativeToken)
  }

  async getWalletClientForEvmNetwork(
    evmNetworkId: EvmNetworkId,
    account?: `0x${string}` | Account,
  ): Promise<WalletClient | null> {
    const network = await this.#chaindataProvider.evmNetworkById(evmNetworkId)
    if (!network?.nativeTokenId) return null

    const nativeToken = await this.#chaindataProvider.tokenById(network.nativeTokenId)
    if (!nativeToken) return null

    return getEvmNetworkWalletClient(network, nativeToken, {
      account,
    })
  }

  public clearRpcProvidersCache(evmNetworkId?: EvmNetworkId) {
    clearPublicClientCache(evmNetworkId)
  }
}
