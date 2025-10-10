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

    // If specific input token symbols were requested, filter client-side
    if (filter?.inputToken) {
      const requestedSymbols = new Set(
        filter.inputToken
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.toLowerCase()),
      )

      const filtered = products.filter((product) =>
        product.inputTokens?.every((t) => requestedSymbols.has((t.symbol || "").toLowerCase())),
      )

      log.debug("[Yield] Client-filtered products", {
        before: products.length,
        after: filtered.length,
        requested: Array.from(requestedSymbols.values()),
      })

      return filtered
    }

    return products
  } catch (error) {
    log.error("[Yield] Failed to fetch yield products via SDK", { error, filter })
    return []
  }
}
