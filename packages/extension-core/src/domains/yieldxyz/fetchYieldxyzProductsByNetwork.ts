import { Networks, YieldDto } from "@yieldxyz/sdk"
import { log } from "extension-shared"

import { yieldxyz } from "./yieldxyz"
import { yieldxyzProductsCache } from "./yieldxyzProductsCache"

/**
 * Fetches yield products for multiple tokens on a specific network
 * Handles pagination automatically to get all available products
 * Uses caching to avoid redundant API calls
 */
export const fetchYieldxyzProductsByNetwork = async (
  network: Networks,
  tokenAddresses: string[],
): Promise<YieldDto[]> => {
  try {
    log.debug("[Yield.xyz] Fetching products by network", {
      network,
      tokenCount: tokenAddresses.length,
    })

    // Check cache first
    // const cachedProducts = await yieldxyzProductsCache.get(network)
    // if (cachedProducts) {
    //   log.debug("[Yield.xyz] Using cached products for network", {
    //     network,
    //     productCount: cachedProducts.length,
    //   })
    //   return cachedProducts
    // }

    // Build comma-separated inputToken string
    const inputTokenString = tokenAddresses.join(",")

    // Fetch all pages of results
    const allProducts: YieldDto[] = []
    let offset = 0
    const limit = 100
    let hasMorePages = true

    while (hasMorePages) {
      log.debug("[Yield.xyz] Fetching page", { network, offset, limit })

      const response = await yieldxyz.getYieldsBatch({
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
        log.warn("[Yield.xyz] Reached maximum offset limit, stopping pagination", {
          network,
          offset,
        })
        break
      }
    }

    log.debug("[Yield.xyz] Completed fetching all products for network", {
      network,
      totalProducts: allProducts.length,
      pagesFetched: Math.ceil(offset / limit) + 1,
    })

    // Cache the complete result
    await yieldxyzProductsCache.set(network, allProducts)

    return allProducts
  } catch (error) {
    log.error("[Yield.xyz] Failed to fetch products by network", {
      network,
      tokenCount: tokenAddresses.length,
      error,
    })
    throw error
  }
}
