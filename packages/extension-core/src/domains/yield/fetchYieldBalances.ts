import { log, YIELD_API_BASE_URL, YIELD_API_KEY } from "extension-shared"

import { YieldBalanceQuery, YieldBalancesResponse } from "./types"

export const fetchYieldBalances = async (
  queries: YieldBalanceQuery[],
): Promise<YieldBalancesResponse> => {
  if (!YIELD_API_KEY) {
    log.error("[Yield] No API key configured")
    return { items: [], errors: [] }
  }

  const url = new URL(`${YIELD_API_BASE_URL}/yields/balances`)

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-API-Key": YIELD_API_KEY,
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify({ queries }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    throw new Error(
      `[Yield] balances error: ${response.status} ${response.statusText} - ${errorText}`,
    )
  }

  return (await response.json()) as YieldBalancesResponse
}
