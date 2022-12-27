import { chaindataProvider } from "@core/rpcs/chaindata"

// TODO: Refactor any code which uses this store to directly
//       call methods on `chaindataProvider` instead!
// TODO: Refactor any code which uses the db at:
//       `import { db } from "@core/db"`
//       to call methods on `chaindataProvider` instead!
export class EvmNetworkStore {
  async clearCustom(): Promise<void> {
    return await chaindataProvider.clearCustomEvmNetworks()
  }

  // TODO MERGE remove this method
  // async replaceChaindata(evmNetworks: (EvmNetwork | CustomEvmNetwork)[]): Promise<void> {
  //   await db.transaction("rw", db.evmNetworks, async () => {
  //     await db.evmNetworks.filter((network) => !("isCustom" in network)).delete()

  //     // do not override networks marked as custom (the only ones remaining in the table at this stage)
  //     const customNetworksIds = (await db.evmNetworks.toArray()).map((n) => n.id)
  //     await db.evmNetworks.bulkPut(evmNetworks.filter((n) => !customNetworksIds.includes(n.id)))
  //   })

  //   // clear providers cache in case rpcs changed
  //   chainConnectorEvm.clearCache()
  // }

  /**
   * Hydrate the store with the latest evmNetworks from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the store has been hydrated, or false if the hydration was skipped.
   */
  async hydrateStore(): Promise<boolean> {
    return await chaindataProvider.hydrateEvmNetworks()
  }
}

export const evmNetworkStore = new EvmNetworkStore()
