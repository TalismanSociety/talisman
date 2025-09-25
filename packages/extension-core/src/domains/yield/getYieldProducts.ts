import { log, YIELD_API_BASE_URL, YIELD_API_KEY } from "extension-shared"

import { YieldProduct, YieldProductsFilter } from "./types"

/**
 * Fetches yield products from yield.xyz API
 */
export const fetchYieldProducts = async (filter?: YieldProductsFilter): Promise<YieldProduct[]> => {
  try {
    log.debug("[Yield] Fetching yield products", { filter })

    // If no API key is configured, return empty array
    if (!YIELD_API_KEY) {
      log.error("[Yield] No API key configured")
      return []
    }

    const url = new URL(`${YIELD_API_BASE_URL}/yields`)

    // Add filtering based on the API documentation
    if (filter?.tokenSymbol) {
      url.searchParams.set("inputTokens", filter.tokenSymbol)
    }

    if (filter?.networkName) {
      url.searchParams.set("network", filter?.networkName)
    }

    const headers: HeadersInit = {}

    // Add API key to headers - yield.xyz uses X-API-Key
    if (YIELD_API_KEY) {
      headers["X-API-Key"] = YIELD_API_KEY
    }

    log.debug("[Yield] Making API request", { url: url.toString() })

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      throw new Error(`Yield API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    log.debug("[Yield] API response received", {
      count: data?.items?.length || data?.length || 0,
      total: data?.total,
      dataType: Array.isArray(data) ? "array" : typeof data,
      firstItem: Array.isArray(data) ? data[0] : data?.items?.[0],
      keys: typeof data === "object" ? Object.keys(data) : [],
    })

    const transformed = transformYieldApiResponse(data)
    log.debug("[Yield] Transformed data", {
      count: transformed.length,
      firstTransformed: transformed[0],
    })

    return transformed
  } catch (error) {
    log.error("[Yield] Failed to fetch yield products", { error, filter })

    // Return empty array on error - UI will show appropriate error message
    log.warn("[Yield] Returning empty array due to API error")
    return []
  }
}

// Type definitions for yield.xyz API response
interface YieldApiResponse {
  items?: YieldProduct[]
  total?: number
  offset?: number
  limit?: number
}

/**
 * Pass through yield.xyz API response without transformation
 */
const transformYieldApiResponse = (apiData: YieldApiResponse | YieldProduct[]): YieldProduct[] => {
  // Handle both array and object responses - pass through as-is
  return Array.isArray(apiData) ? apiData : apiData?.items || []
}
