import { log } from "extension-shared"

import { BalancesRequestDto, YieldBalancesDto } from "./types"
import { yieldSdk } from "./yieldSdk"

export const fetchYieldBalances = async (
  queries: BalancesRequestDto,
): Promise<YieldBalancesDto[]> => {
  try {
    log.debug("[Yield] Fetching balances via SDK", { queryCount: queries })

    const response = await yieldSdk.getAggregateBalances(queries)

    log.debug("[Yield] SDK balances response", {
      itemCount: response?.items?.length || 0,
      errorCount: response.errors?.length || 0,
    })

    return response.items
  } catch (error) {
    log.error("[Yield] Failed to fetch balances via SDK", { error })
    return []
  }
}
