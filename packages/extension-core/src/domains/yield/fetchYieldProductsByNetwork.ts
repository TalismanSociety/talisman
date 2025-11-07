import { Networks, YieldDto } from "@yieldxyz/sdk"
import { log } from "extension-shared"

import { yieldSdk } from "./yieldSdk"

/**
 * Fetches yield products for multiple tokens on a specific network
 * Handles pagination automatically to get all available products
 * Caching is handled by the observable layer (matching Portfolio pattern)
 */
export const fetchYieldProductsByNetwork = async (
  network: Networks,
  tokenAddresses: string[],
): Promise<YieldDto[]> => {
  try {
    log.debug("[Yield] Fetching products by network", {
      network,
      tokenCount: tokenAddresses.length,
    })

    // Build comma-separated inputToken string
    const inputTokenString = tokenAddresses.join(",")

    // Fetch all pages of results
    const allProducts: YieldDto[] = []
    let offset = 0
    const limit = 100
    let hasMorePages = true

    while (hasMorePages) {
      log.debug("[Yield] Fetching page", { network, offset, limit })

      const response = await yieldSdk.getYieldsBatch({
        network,
        inputTokens: inputTokenString,
        limit,
        offset,
      })

      // Handle response structure - may include items and total fields
      const products = response?.items || response || []
      allProducts.push(...products)

      // Check if we need to fetch more pages
      // If we got fewer items than requested, we've reached the end
      hasMorePages = products.length === limit

      if (hasMorePages) {
        offset += limit
      }

      // Safety check to prevent infinite loops
      if (offset > 10000) {
        log.warn("[Yield] Reached maximum offset limit, stopping pagination", {
          network,
          offset,
        })
        break
      }
    }

    log.debug("[Yield] Completed fetching all products for network", {
      network,
      totalProducts: allProducts.length,
      pagesFetched: Math.ceil(offset / limit) + 1,
    })

    return allProducts
  } catch (error) {
    log.error("[Yield] Failed to fetch products by network", {
      network,
      tokenCount: tokenAddresses.length,
      error,
    })
    throw error
  }
}
