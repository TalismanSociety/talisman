import { DEBUG } from "@core/constants"
import { db } from "@core/db"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { fetchTokenRates } from "@talismn/token-rates"

const minimumHydrationInterval = 60_000 // 60_000ms = 60s = 1 minute

export class TokenRatesStore {
  #lastHydratedAt = 0

  async hydrateStore(): Promise<boolean> {
    const now = Date.now()
    if (now - this.#lastHydratedAt < minimumHydrationInterval) return false

    try {
      // update tokenRates for known tokens
      const tokens = await chaindataProvider.tokens()
      const tokenRates = await fetchTokenRates(tokens)
      db.tokenRates.bulkPut(
        Object.entries(tokenRates).map(([tokenId, tokenRates]) => ({
          tokenId,
          rates: tokenRates,
        }))
      )

      // delete tokenRates for tokens which no longer exist
      const tokenIds = await db.tokenRates.toCollection().primaryKeys()
      await db.tokenRates.bulkDelete(tokenIds.filter((tokenId) => tokens[tokenId] === undefined))

      // update lastHydratedAt
      this.#lastHydratedAt = now

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      DEBUG && console.error(`Failed to fetch tokenRates`, error)
      return false
    }
  }
}

export const tokenRatesStore = new TokenRatesStore()
