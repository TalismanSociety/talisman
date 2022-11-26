import { DEBUG } from "@core/constants"
import { CustomEvmNetwork, EvmNetwork, EvmNetworkList } from "@core/domains/ethereum/types"
import { db } from "@core/libs/db"
import { EvmNetworkFragment, graphqlUrl } from "@core/util/graphql"
import { print } from "graphql"
import gql from "graphql-tag"
import { clearEvmRpcProvidersCache } from "./rpcProviders"

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
    await db.transaction("rw", db.evmNetworks, async () => {
      await db.evmNetworks.filter((network) => !("isCustom" in network)).delete()

      // do not override networks marked as custom (the only ones remaining in the table at this stage)
      const customNetworksIds = (await db.evmNetworks.toArray()).map((n) => n.id)
      await db.evmNetworks.bulkPut(evmNetworks.filter((n) => !customNetworksIds.includes(n.id)))
    })

    // clear providers cache in case rpcs changed
    clearEvmRpcProvidersCache()
  }

  /**
   * Hydrate the store with the latest evmNetworks from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the store has been hydrated, or false if the hydration was skipped.
   */
  async hydrateStore(force?: boolean): Promise<boolean> {
    const now = Date.now()
    if (!force) {
      if (now - this.#lastHydratedAt < minimumHydrationInterval) return false
    }

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
