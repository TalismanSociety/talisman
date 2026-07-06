import { yieldToEventLoop } from "@talismn/util"
import { defer, map, of, switchMap } from "rxjs"

import type { IBalanceModule } from "../../types/IBalanceModule"
import { getBalanceDefs } from "../shared"
import { getRpcQueryPack$ } from "../shared/rpcQueryPack"
import { buildQueries } from "./buildQueries"
import type { MiniMetadataExtra, MODULE_TYPE, ModuleConfig, TokenConfig } from "./config"

export const subscribeBalances: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig,
  MiniMetadataExtra
>["subscribeBalances"] = ({ networkId, tokensWithAddresses, connector, miniMetadata }) => {
  if (!tokensWithAddresses.length) return of({ success: [], errors: [] })

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  return defer(async () => {
    // on a scale-builder cache miss, query building parses/builds the chain metadata
    // (expensive, indivisible) — give it its own macrotask so it doesn't stack with
    // the current tick's other work
    await yieldToEventLoop()
    return buildQueries(networkId, balanceDefs, miniMetadata)
  }).pipe(
    switchMap((queries) => getRpcQueryPack$(connector, networkId, queries)),
    map((balances) => ({
      success: balances,
      errors: [],
    }))
  )
}
