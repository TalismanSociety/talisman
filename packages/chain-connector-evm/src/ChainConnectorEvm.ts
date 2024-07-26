import {
  EvmNetworkId,
  IChaindataEvmNetworkProvider,
  IChaindataTokenProvider,
} from "@talismn/chaindata-provider"
import { Account, PublicClient, WalletClient } from "viem"

import { clearPublicClientCache, getEvmNetworkPublicClient } from "./getEvmNetworkPublicClient"
import { getEvmNetworkWalletClient } from "./getEvmNetworkWalletClient"

export type ChainConnectorEvmOptions = {
  onfinalityApiKey?: string
}

export class ChainConnectorEvm {
  #chaindataProvider: IChaindataEvmNetworkProvider & IChaindataTokenProvider
  #onfinalityApiKey?: string

  constructor(
    chaindataProvider: IChaindataEvmNetworkProvider & IChaindataTokenProvider,
    options?: ChainConnectorEvmOptions
  ) {
    this.#chaindataProvider = chaindataProvider
    this.#onfinalityApiKey = options?.onfinalityApiKey ?? undefined
  }

  setOnfinalityApiKey(apiKey: string | undefined) {
    this.#onfinalityApiKey = apiKey
    this.clearRpcProvidersCache()
  }

  async getPublicClientForEvmNetwork(evmNetworkId: EvmNetworkId): Promise<PublicClient | null> {
    const network = await this.#chaindataProvider.evmNetworkById(evmNetworkId)
    if (!network?.nativeToken?.id) return null

    const nativeToken = await this.#chaindataProvider.tokenById(network.nativeToken.id)

    return getEvmNetworkPublicClient(network, nativeToken, {
      onFinalityApiKey: this.#onfinalityApiKey,
    })
  }

  async getWalletClientForEvmNetwork(
    evmNetworkId: EvmNetworkId,
    account?: `0x${string}` | Account
  ): Promise<WalletClient | null> {
    const network = await this.#chaindataProvider.evmNetworkById(evmNetworkId)
    if (!network?.nativeToken?.id) return null

    const nativeToken = await this.#chaindataProvider.tokenById(network.nativeToken.id)
    if (!nativeToken) return null

    return getEvmNetworkWalletClient(network, nativeToken, {
      onFinalityApiKey: this.#onfinalityApiKey,
      account,
    })
  }

  public clearRpcProvidersCache(evmNetworkId?: EvmNetworkId) {
    clearPublicClientCache(evmNetworkId)
  }
}
