import { map, of, switchMap } from "rxjs"

import { IBalanceModule } from "../../types/IBalanceModule"
import { getBalanceDefs } from "../shared"
import { getRpcQueryPack$ } from "../shared/rpcQueryPack"
import { MiniMetadataExtra, MODULE_TYPE, ModuleConfig, TokenConfig } from "./config"
import { buildBaseQueries } from "./queries/buildBaseQueries"
import { buildNomPoolQueries } from "./queries/buildNomPoolQueries"

export const subscribeBalances: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig,
  MiniMetadataExtra
>["subscribeBalances"] = ({ networkId, tokensWithAddresses, connector, miniMetadata }) => {
  if (!tokensWithAddresses.length) return of({ success: [], errors: [] })

  // could be use as shared observable key if we decide to cache the sub
  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  const baseQueries = buildBaseQueries(networkId, balanceDefs, miniMetadata)

  return getRpcQueryPack$(connector, networkId, baseQueries).pipe(
    switchMap((partialBalances) => {
      // now for each balance that includes nomPoolStaking, we need to fetch the metadata for the pool
      const nomPoolQueries = buildNomPoolQueries(networkId, partialBalances, miniMetadata)
      return getRpcQueryPack$(connector, networkId, nomPoolQueries)
    }),
    map((balances) => ({
      success: balances,
      errors: [],
    })),
  )
}
