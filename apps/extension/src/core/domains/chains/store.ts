import { DEBUG } from "@core/constants"
import { Chain, ChainList } from "@core/domains/chains/types"
import { db } from "@core/libs/db"
import addCustomChainRpcs from "@core/util/addCustomChainRpcs"

import { getChains, getChainsIsHealthyOnly } from "./api"

const minimumHydrationInterval = 43_200_000 // 43_200_000ms = 43_200s = 720m = 12 hours
const minimumHealthUpdateInterval = 600_000 // 600_0000ms = 6000s = 10m

export class ChainStore {
  #lastHydratedAt = 0
  #lastUpdatedHealthAt = 0
  #nowUpdatingRpcHealth = false

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
  /**
   * Update the store with the latest data on chain RPC health from subsquid.
   * Updating is skipped when the last successful update was less than minimumHealthUpdateInterval ms ago, or if
   * the method is already in the process of being called.
   *
   * @returns A promise which resolves to true if the store has been update, or false if the update was skipped.
   */
  async updateRpcHealth(): Promise<boolean> {
    const now = Date.now()
    if (this.#nowUpdatingRpcHealth || now - this.#lastUpdatedHealthAt < minimumHealthUpdateInterval)
      return false
    this.#nowUpdatingRpcHealth = true

    try {
      const chains = await getChainsIsHealthyOnly()
      const chainList = chainsToChainList(addCustomChainRpcs(chains))

      if (Object.keys(chainList).length <= 0)
        throw new Error("Ignoring empty chaindata chains response")

      await db.transaction("rw", db.chains, () => {
        Object.values(chainList).forEach((chainRpcHealth) => {
          db.chains.update(chainRpcHealth.id, {
            rpcs: chainRpcHealth.rpcs,
            isHealthy: chainRpcHealth.isHealthy,
          })
        })
      })
      this.#lastUpdatedHealthAt = now
      this.#nowUpdatingRpcHealth = false

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      DEBUG && console.error(error)

      this.#nowUpdatingRpcHealth = false

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
