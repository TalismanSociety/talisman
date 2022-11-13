import { chaindataProvider } from "@core/domains/chaindata"

// TODO: Refactor any code which uses this store to directly
//       call methods on `chaindataProvider` instead!
// TODO: Refactor any code which uses the db at:
//       `import { db } from "@core/libs/db"`
//       to call methods on `chaindataProvider` instead!
export class ChainStore {
  async hydrateStore(): Promise<boolean> {
    return await chaindataProvider.hydrateChains()
  }
}

export const chainStore = new ChainStore()
