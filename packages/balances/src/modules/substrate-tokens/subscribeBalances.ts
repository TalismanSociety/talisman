import { map, of } from "rxjs"

import { IBalanceModule } from "../../types/IBalanceModule"
import { getBalanceDefs } from "../shared"
import { getRpcQueryPack$ } from "../shared/rpcQueryPack"
import { buildQueries } from "./buildQueries"
import { MiniMetadataExtra, MODULE_TYPE, ModuleConfig, TokenConfig } from "./config"

export const subscribeBalances: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig,
  MiniMetadataExtra
>["subscribeBalances"] = ({ networkId, tokensWithAddresses, connector, miniMetadata }) => {
  if (!tokensWithAddresses.length) return of({ success: [], errors: [] })

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  const queries = buildQueries(networkId, balanceDefs, miniMetadata)

  return getRpcQueryPack$(connector, networkId, queries).pipe(
    map((balances) => ({
      success: balances,
      errors: [],
    })),
  )
}
