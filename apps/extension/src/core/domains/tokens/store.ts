import { chaindataProvider } from "@core/rpcs/chaindata"

// TODO: Refactor any code which uses this store to directly
//       call methods on `chaindataProvider` instead!
// TODO: Refactor any code which uses the db at:
//       `import { db } from "@core/db"`
//       to call methods on `chaindataProvider` instead!
export class TokenStore {
  async clearCustom(): Promise<void> {
    return await chaindataProvider.clearCustomTokens()
  }

  async hydrateStore(): Promise<boolean> {
    return await chaindataProvider.hydrateTokens()
  }
}

export const tokenStore = new TokenStore()
