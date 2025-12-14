// import { log } from "extension-shared"

// import { BalancesRequestDto, YieldBalancesDto } from "./types"
// import { yieldxyz } from "./yieldxyz"

// export const fetchYieldxyzBalances = async (
//   queries: BalancesRequestDto,
// ): Promise<YieldBalancesDto[]> => {
//   try {
//     log.debug("[Yield.xyz] Fetching balances via SDK", { queries })

//     const response = await yieldxyz.getAggregateBalances(queries)

//     log.debug("[Yield.xyz] SDK balances response", {
//       itemCount: response?.items?.length || 0,
//       errorCount: response.errors?.length || 0,
//       queries,
//       response,
//     })

//     return response.items
//   } catch (error) {
//     log.error("[Yield.xyz] Failed to fetch balances via SDK", { error })
//     return []
//   }
// }
