import { ChaindataTokenProvider, EvmNetworkId } from "@talismn/chaindata-provider"
import { ChaindataEvmNetworkProvider } from "@talismn/chaindata-provider"
import { Account, PublicClient, WalletClient } from "viem"

import { clearPublicClientCache, getEvmNetworkPublicClient } from "./getEvmNetworkPublicClient"
import { getEvmNetworkWalletClient } from "./getEvmNetworkWalletClient"

export type ChainConnectorEvmOptions = {
  onfinalityApiKey?: string
}

export class ChainConnectorEvm {
  #chaindataProvider: ChaindataEvmNetworkProvider & ChaindataTokenProvider
  #onfinalityApiKey?: string

  constructor(
    chaindataProvider: ChaindataEvmNetworkProvider & ChaindataTokenProvider,
    options?: ChainConnectorEvmOptions
  ) {
    this.#chaindataProvider = chaindataProvider
    this.#onfinalityApiKey = options?.onfinalityApiKey ?? undefined
  }

  public setOnfinalityApiKey(apiKey: string | undefined) {
    this.#onfinalityApiKey = apiKey
    this.clearRpcProvidersCache()
  }

  public async getPublicClientForEvmNetwork(
    evmNetworkId: EvmNetworkId
  ): Promise<PublicClient | null> {
    const network = await this.#chaindataProvider.getEvmNetwork(evmNetworkId)
    if (!network?.nativeToken?.id) return null
    const nativeToken = await this.#chaindataProvider.getToken(network.nativeToken.id)
    if (!nativeToken) return null

    return getEvmNetworkPublicClient(network, nativeToken, {
      onFinalityApiKey: this.#onfinalityApiKey,
    })
  }

  public async getWalletClientForEvmNetwork(
    evmNetworkId: EvmNetworkId,
    account?: `0x${string}` | Account
  ): Promise<WalletClient | null> {
    const network = await this.#chaindataProvider.getEvmNetwork(evmNetworkId)
    if (!network?.nativeToken?.id) return null
    const nativeToken = await this.#chaindataProvider.getToken(network.nativeToken.id)
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
