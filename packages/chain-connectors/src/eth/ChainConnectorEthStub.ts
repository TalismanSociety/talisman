import { EthNetwork, EthNetworkId } from "@talismn/chaindata-provider"
import { Account, PublicClient, WalletClient } from "viem"

import { getEvmNetworkPublicClient } from "./getEvmNetworkPublicClient"
import { getEvmNetworkWalletClient } from "./getEvmNetworkWalletClient"
import { IChainConnectorEth } from "./IChainConnectorEth"

export class ChainConnectorEthStub implements IChainConnectorEth {
  #network: EthNetwork

  constructor(network: EthNetwork) {
    this.#network = network
  }

  async getPublicClientForEvmNetwork(): Promise<PublicClient | null> {
    return getEvmNetworkPublicClient(this.#network)
  }

  async getWalletClientForEvmNetwork(
    networkId: EthNetworkId,
    account?: `0x${string}` | Account,
  ): Promise<WalletClient | null> {
    return getEvmNetworkWalletClient(this.#network, { account })
  }

  clearRpcProvidersCache(): void {
    // No-op for stub
  }
}
