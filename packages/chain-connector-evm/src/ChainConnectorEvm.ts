import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@talismn/chaindata-provider"
import { providers } from "ethers"

export type GetProviderOptions = {
  /** If true, returns a provider which will batch requests */
  batch?: boolean
}

export class ChainConnectorEvm {
  #evmNetworkProviders: Record<EvmNetworkId, providers.JsonRpcProvider> = {}
  #evmNetworkBatchProviders: Record<EvmNetworkId, providers.JsonRpcBatchProvider> = {}

  getProviderForEvmNetwork(
    evmNetwork: EvmNetwork | CustomEvmNetwork,
    { batch }: GetProviderOptions = {}
  ): providers.JsonRpcProvider | null {
    const providersStore =
      batch === true ? this.#evmNetworkBatchProviders : this.#evmNetworkProviders

    if (providersStore[evmNetwork.id]) return providersStore[evmNetwork.id]

    const provider = this.newProviderFromEvmNetwork(evmNetwork, { batch })
    if (provider === null) return null

    providersStore[evmNetwork.id] = provider
    return providersStore[evmNetwork.id]
  }

  private newProviderFromEvmNetwork(
    evmNetwork: EvmNetwork | CustomEvmNetwork,
    { batch }: GetProviderOptions = {}
  ): providers.JsonRpcProvider | null {
    if (
      !Array.isArray(evmNetwork.rpcs) ||
      evmNetwork.rpcs.filter(({ isHealthy }) => isHealthy).length === 0
    )
      return null

    const url = evmNetwork.rpcs.filter(({ isHealthy }) => isHealthy).map(({ url }) => url)[0]
    const network = { name: evmNetwork.name ?? "unknown network", chainId: parseInt(evmNetwork.id) }

    return batch === true
      ? new providers.JsonRpcBatchProvider(url, network)
      : new providers.JsonRpcProvider(url, network)
  }
}
