import { chaindataProvider } from "@core/domains/chaindata"

// TODO: Refactor any code which uses this store to directly
//       call methods on `chaindataProvider` instead!
// TODO: Refactor any code which uses the db at:
//       `import { db } from "@core/libs/db"`
//       to call methods on `chaindataProvider` instead!
export class EvmNetworkStore {
  async clearCustom(): Promise<void> {
    return await chaindataProvider.clearCustomEvmNetworks()
  }

  async hydrateStore(): Promise<boolean> {
    return await chaindataProvider.hydrateEvmNetworks()
  }
}

export const evmNetworkStore = new EvmNetworkStore()
