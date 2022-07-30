import { DEBUG } from "@core/constants"
import { CustomEvmNetwork, EvmNetwork, EvmNetworkList } from "@core/domains/ethereum/types"
import { db } from "@core/libs/db"
import { EvmNetworkFragment, graphqlUrl } from "@core/util/graphql"
import { ethers, providers } from "ethers"
import { print } from "graphql"
import gql from "graphql-tag"

const minimumHydrationInterval = 43_200_000 // 43_200_000ms = 43_200s = 720m = 12 hours

export class EvmNetworkStore {
  #lastHydratedAt = 0

  async clearCustom(): Promise<void> {
    db.transaction("rw", db.evmNetworks, () => {
      db.evmNetworks
        .filter((network) => "isCustom" in network && network.isCustom === true)
        .delete()
    })
  }

  async replaceChaindata(evmNetworks: (EvmNetwork | CustomEvmNetwork)[]): Promise<void> {
    await db.transaction("rw", db.evmNetworks, () => {
      db.evmNetworks.filter((network) => !("isCustom" in network)).delete()
      db.evmNetworks.bulkPut(evmNetworks)
    })
  }

  /**
   * Hydrate the store with the latest evmNetworks from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the store has been hydrated, or false if the hydration was skipped.
   */
  async hydrateStore(): Promise<boolean> {
    const now = Date.now()
    if (now - this.#lastHydratedAt < minimumHydrationInterval) return false

    try {
      const { data } = await (
        await fetch(graphqlUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: print(evmNetworksQuery) }),
        })
      ).json()

      const evmNetworksList = evmNetworksResponseToEvmNetworkList(data?.evmNetworks || [])

      if (Object.keys(evmNetworksList).length <= 0)
        throw new Error("Ignoring empty chaindata evmNetworks response")

      await this.replaceChaindata(Object.values(evmNetworksList))
      this.#lastHydratedAt = now

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      DEBUG && console.error(error)

      return false
    }
  }
}

// TODO: Extract to a separate ethereum rpc module to make these available to the extension separately to this store
export const ethereumNetworksToProviders = (
  ethereumNetworks: EvmNetworkList
): Record<number, providers.JsonRpcBatchProvider> =>
  Object.fromEntries(
    Object.values(ethereumNetworks)
      .map((ethereumNetwork) => [ethereumNetwork.id, ethereumNetworkToProvider(ethereumNetwork)])
      .filter(([, network]) => network !== null)
  )

export const ethereumNetworkToProvider = (
  ethereumNetwork: EvmNetwork | CustomEvmNetwork,
  batch = false
): providers.JsonRpcProvider | null => {
  if (
    !Array.isArray(ethereumNetwork.rpcs) ||
    ethereumNetwork.rpcs.filter(({ isHealthy }) => isHealthy).length === 0
  )
    return null

  const url = ethereumNetwork.rpcs.filter(({ isHealthy }) => isHealthy).map(({ url }) => url)[0]
  const network = { name: ethereumNetwork.name ?? "unknown network", chainId: ethereumNetwork.id }

  return batch
    ? new ethers.providers.JsonRpcBatchProvider(url, network)
    : new ethers.providers.JsonRpcProvider(url, network)
}

const ethereumNetworkProviders: Record<number, providers.JsonRpcProvider> = {}
const ethereumNetworkBatchProviders: Record<number, providers.JsonRpcBatchProvider> = {}
export const getProviderForEthereumNetwork = (
  ethereumNetwork: EvmNetwork | CustomEvmNetwork,
  batch = false
): providers.JsonRpcProvider | null => {
  const providersStore = batch ? ethereumNetworkBatchProviders : ethereumNetworkProviders

  if (providersStore[ethereumNetwork.id]) return providersStore[ethereumNetwork.id]

  const provider = ethereumNetworkToProvider(ethereumNetwork, batch)
  if (provider === null) return null

  providersStore[ethereumNetwork.id] = provider
  return providersStore[ethereumNetwork.id]
}

export const getProviderForEvmNetworkId = async (
  chainId: number,
  batch = false
): Promise<providers.JsonRpcProvider | null> => {
  const network = await db.evmNetworks.get(chainId)
  if (network) return getProviderForEthereumNetwork(network, batch)
  return null
}

const evmNetworksResponseToEvmNetworkList = (
  evmNetworks: Array<EvmNetwork & { id: string }>
): EvmNetworkList =>
  evmNetworks
    .map((evmNetwork: EvmNetwork & { id: string }) => ({
      ...evmNetwork,
      id: parseInt(evmNetwork.id),
    }))
    .reduce(
      (allEvmNetworks: EvmNetworkList, evmNetwork: EvmNetwork) => ({
        ...allEvmNetworks,
        [evmNetwork.id]: evmNetwork,
      }),
      {}
    )

export const evmNetworksQuery = gql`
  {
    evmNetworks(orderBy: sortIndex_ASC) {
      ...EvmNetwork
    }
  }
  ${EvmNetworkFragment}
`

export const evmNetworkStore = new EvmNetworkStore()
export default evmNetworkStore
