import { toPairs } from "lodash"
import { combineLatest, map, of, switchMap } from "rxjs"

import { IBalanceModule } from "../IBalanceModule"
import { getBalanceDefs } from "../shared"
import { getRpcQueryPack$ } from "../shared/rpcQueryPack"
import { getSubtensorStakingBalances$ } from "./bittensor/getSubtensorStakingBalances"
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
  const baseBalances$ = getRpcQueryPack$(connector, networkId, baseQueries).pipe(
    switchMap((partialBalances) => {
      // now for each balance that includes nomPoolStaking, we need to fetch the metadata for the pool
      const nomPoolQueries = buildNomPoolQueries(networkId, partialBalances, miniMetadata)
      return getRpcQueryPack$(connector, networkId, nomPoolQueries)
    }),
  )

  const subtensorBalancesByAddress$ = getSubtensorStakingBalances$(
    connector,
    networkId,
    balanceDefs,
    miniMetadata,
  )

  return combineLatest([baseBalances$, subtensorBalancesByAddress$]).pipe(
    map(([baseBalances, subtensorBalancesByAddress]) => {
      // add subtensor balances to base balances
      for (const [address, subtensorBalances] of toPairs(subtensorBalancesByAddress)) {
        const balance = baseBalances.find((b) => b.address === address)
        if (balance?.values) balance.values.push(...subtensorBalances)
      }

      return { success: baseBalances, errors: [] }
    }),
  )
}
