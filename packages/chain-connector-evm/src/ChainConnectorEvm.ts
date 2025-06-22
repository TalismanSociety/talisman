import {
  EthNetworkId,
  EvmNetworkId,
  IChaindataNetworkProvider,
  IChaindataTokenProvider,
} from "@talismn/chaindata-provider"
import { Account, PublicClient, WalletClient } from "viem"

import { clearPublicClientCache, getEvmNetworkPublicClient } from "./getEvmNetworkPublicClient"
import { getEvmNetworkWalletClient } from "./getEvmNetworkWalletClient"

export class ChainConnectorEvm {
  #chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider

  constructor(chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider) {
    this.#chaindataProvider = chaindataProvider
  }

  async getPublicClientForEvmNetwork(evmNetworkId: EvmNetworkId): Promise<PublicClient | null> {
    const network = await this.#chaindataProvider.getNetworkById(evmNetworkId, "ethereum")
    if (!network?.nativeTokenId) return null

    const nativeToken = await this.#chaindataProvider.getTokenById(
      network.nativeTokenId,
      "evm-native",
    )

    return getEvmNetworkPublicClient(network, nativeToken)
  }

  async getWalletClientForEvmNetwork(
    evmNetworkId: EthNetworkId,
    account?: `0x${string}` | Account,
  ): Promise<WalletClient | null> {
    const network = await this.#chaindataProvider.getNetworkById(evmNetworkId, "ethereum")
    if (!network?.nativeTokenId) return null

    const nativeToken = await this.#chaindataProvider.getTokenById(
      network.nativeTokenId,
      "evm-native",
    )
    if (!nativeToken) return null

    return getEvmNetworkWalletClient(network, nativeToken, {
      account,
    })
  }

  public clearRpcProvidersCache(evmNetworkId?: EvmNetworkId) {
    clearPublicClientCache(evmNetworkId)
  }
}
