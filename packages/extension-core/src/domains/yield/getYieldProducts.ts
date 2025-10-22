import { YieldsControllerGetYieldsParams } from "@yieldxyz/sdk"
import { log } from "extension-shared"

import { YieldDto } from "./types"
import { yieldSdk } from "./yieldSdk"

/**
 * Fetches yield products from yield.xyz API using SDK
 */
export const fetchYieldProducts = async (
  filter?: YieldsControllerGetYieldsParams,
): Promise<YieldDto[]> => {
  try {
    log.debug("[Yield] Fetching yield products via SDK", { filter })

    const response = await yieldSdk.getYields(filter)

    log.debug("[Yield] SDK yields response", {
      count: response?.items?.length || 0,
      firstItem: response?.items?.[0],
    })

    // SDK returns array directly, no transformation needed
    const products = response?.items || []

    // If specific input token identifiers were requested, filter client-side
    if (filter?.inputToken) {
      const requestedIdentifiers = new Set(
        filter.inputToken
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.toLowerCase()),
      )

      const filtered = products.filter((product) =>
        product.inputTokens?.every((t) => {
          const symbol = (t.symbol || "").toLowerCase()
          const address = (t.address || "").toLowerCase()

          // Check if any requested identifier matches either symbol or address
          return Array.from(requestedIdentifiers).some(
            (identifier) => identifier === symbol || identifier === address,
          )
        }),
      )

      log.debug("[Yield] Client-filtered products", {
        before: products.length,
        after: filtered.length,
        requested: Array.from(requestedIdentifiers.values()),
      })

      // Sort filtered products by reward rate (highest first)
      const sortedFiltered = filtered.sort(
        (a, b) => (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0),
      )

      return sortedFiltered
    }

    // Sort products by reward rate (highest first)
    const sortedProducts = products.sort(
      (a, b) => (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0),
    )

    return sortedProducts
  } catch (error) {
    log.error("[Yield] Failed to fetch yield products via SDK", { error, filter })
    return []
  }
}
