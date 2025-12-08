import { log } from "extension-shared"

import { YieldDto, YieldxyzControllerGetYieldsParamsExtended } from "./types"
import { yieldxyz } from "./yieldxyz"

/**
 * Fetches yield products from yield.xyz API using SDK
 */
export const fetchYieldxyzProducts = async (
  filter?: YieldxyzControllerGetYieldsParamsExtended,
): Promise<YieldDto[]> => {
  try {
    log.debug("[Yield.xyz] Fetching yield products via SDK", { filter })

    const response = await yieldxyz.getYields(filter)

    log.debug("[Yield.xyz] SDK yields response", {
      count: response?.items?.length || 0,
      firstItem: response?.items?.[0],
    })

    // SDK returns array directly, no transformation needed
    const products = response?.items || []

    // If specific input token identifiers were requested, filter client-side
    if (filter?.inputTokens) {
      const requestedIdentifiers = new Set(
        filter.inputTokens
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

      log.debug("[Yield.xyz] Client-filtered products", {
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
    log.error("[Yield.xyz] Failed to fetch yield products via SDK", { error, filter })
    return []
  }
}
