import { firstValueFrom } from "rxjs"

import log from "../../log"
import { IBalanceModule } from "../IBalanceModule"
import { getBalanceDefs } from "../shared/types"
import { fetchQueriesPack } from "../util/RpcStateQueriesHelper"
import { getSubtensorStakingBalances$ } from "./bittensor/getSubtensorStakingBalances"
import { MiniMetadataExtra, MODULE_TYPE, ModuleConfig, TokenConfig } from "./config"
import { buildBaseQueries } from "./queries/buildBaseQueries"
import { buildNomPoolQueries } from "./queries/buildNomPoolQueries"

export const fetchBalances: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig,
  MiniMetadataExtra
>["fetchBalances"] = async ({ networkId, tokensWithAddresses, connector, miniMetadata }) => {
  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  if (!miniMetadata?.data) {
    log.warn("MiniMetadata is required for fetching balances")
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error("Minimetadata is required for fetching balances"),
      })),
    }
  }
  if (miniMetadata.source !== MODULE_TYPE) {
    log.warn(`Ignoring miniMetadata with source ${miniMetadata.source} in ${MODULE_TYPE}.`)
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error(`Invalid request: miniMetadata source is not ${MODULE_TYPE}`),
      })),
    }
  }
  if (miniMetadata.chainId !== networkId) {
    log.warn(
      `Ignoring miniMetadata with chainId ${miniMetadata.chainId} in ${MODULE_TYPE}. Expected chainId is ${networkId}`,
    )
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error(`Invalid request: Expected chainId is ${networkId}`),
      })),
    }
  }

  const queries = buildBaseQueries(networkId, balanceDefs, miniMetadata)
  const partialBalances = await fetchQueriesPack(connector, networkId, queries)

  // now for each balance that includes nomPoolStaking, we need to fetch the metadata for the pool
  const nomPoolQueries = buildNomPoolQueries(networkId, partialBalances, miniMetadata)
  const balances = await fetchQueriesPack(connector, networkId, nomPoolQueries)

  // TODO ⚠️ dedupe locks

  const subtensorBalances$ = getSubtensorStakingBalances$(
    connector,
    networkId,
    balanceDefs,
    miniMetadata,
  )
  const subtensorBalancesByAddress = await firstValueFrom(subtensorBalances$)

  for (const [address, subtensorBalances] of Object.entries(subtensorBalancesByAddress)) {
    const balance = balances.find((b) => b.address === address)
    if (balance?.values) balance.values.push(...subtensorBalances)
  }

  return { success: balances, errors: [] }
}
