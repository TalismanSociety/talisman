import { log, YIELD_API_BASE_URL } from "extension-shared"

export type YieldxyzProvider = {
  id: string
  name: string
  logoURI: string
  description: string
  website: string
  tvlUsd: object | null
  type: "protocol" | "validator_provider"
  references: string[]
}

type YieldXyzProvidersResponse = {
  items: YieldxyzProvider[]
  total: number
  offset: number
  limit: number
}

type PageArgs = {
  offset: number
  limit: number
}

const DEFAULT_PAGE_ARGS: PageArgs = {
  offset: 0,
  limit: 100,
}

export const fetchYieldxyzProviders = async (
  { offset, limit }: PageArgs = DEFAULT_PAGE_ARGS,
  signal?: AbortSignal,
): Promise<YieldXyzProvidersResponse> => {
  const url = new URL(`${YIELD_API_BASE_URL}/providers`)

  url.searchParams.append("offset", offset.toString())
  url.searchParams.append("limit", limit.toString())

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    try {
      const errorResponse = await response.json()
      log.warn("[Yield.xyz] API error response", { status: response.status, errorResponse })
    } catch {
      // ignore
    }
    throw new Error(`Yield API error: ${response.status} - ${response.statusText}`)
  }

  return response.json() as Promise<YieldXyzProvidersResponse>
}
