import { map, of } from "rxjs"

import { IBalanceModule } from "../../types/IBalanceModule"
import { getBalanceDefs } from "../shared"
import { getRpcQueryPack$ } from "../shared/rpcQueryPack"
import { buildQueries } from "./buildQueries"
import { MODULE_TYPE } from "./config"

export const subscribeBalances: IBalanceModule<typeof MODULE_TYPE>["subscribeBalances"] = ({
  networkId,
  tokensWithAddresses,
  connector,
  miniMetadata,
}) => {
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
