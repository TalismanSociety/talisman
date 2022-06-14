import { DEBUG } from "@core/constants"
import { db } from "@core/libs/db"
import { Chain, ChainList } from "@core/types"
import addCustomChainRpcs from "@core/util/addCustomChainRpcs"

import { getChains } from "./api"

const minimumHydrationInterval = 43_200_000 // 43_200_000ms = 43_200s = 720m = 12 hours

export class ChainStore {
  #lastHydratedAt: number = 0

  /**
   * Hydrate the store with the latest chains from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the store has been hydrated, or false if the hydration was skipped.
   */
  async hydrateStore(): Promise<boolean> {
    const now = Date.now()
    if (now - this.#lastHydratedAt < minimumHydrationInterval) return false

    try {
      const chains = await getChains()
      const chainList = chainsToChainList(addCustomChainRpcs(chains))

      if (Object.keys(chainList).length <= 0)
        throw new Error("Ignoring empty chaindata chains response")

      await db.transaction("rw", db.chains, () => {
        db.chains.clear()
        db.chains.bulkPut(Object.values(chainList))
      })
      this.#lastHydratedAt = now

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      DEBUG && console.error(error)

      return false
    }
  }
}

/**
 * Helper function to convert `Chain[]` to `ChainList`.
 */
const chainsToChainList = (chains: Chain[]): ChainList =>
  chains.reduce((allChains: ChainList, chain: Chain) => ({ ...allChains, [chain.id]: chain }), {})

const chainStore = new ChainStore()
export default chainStore
