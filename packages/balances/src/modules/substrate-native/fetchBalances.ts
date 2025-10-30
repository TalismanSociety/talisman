import log from "../../log"
import { IBalanceModule } from "../../types/IBalanceModule"
import { fetchRpcQueryPack } from "../shared/rpcQueryPack"
import { getBalanceDefs } from "../shared/types"
import { MiniMetadataExtra, MODULE_TYPE, ModuleConfig, TokenConfig } from "./config"
import { buildBaseQueries } from "./queries/buildBaseQueries"
import { buildNomPoolQueries } from "./queries/buildNomPoolQueries"

export const fetchBalances: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig,
  MiniMetadataExtra
>["fetchBalances"] = async ({ networkId, tokensWithAddresses, connector, miniMetadata }) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  if (!miniMetadata?.data) {
    log.warn(`MiniMetadata is required for fetching ${MODULE_TYPE} balances on ${networkId}.`)
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

  const baseQueries = buildBaseQueries(networkId, balanceDefs, miniMetadata)
  const partialBalances = await fetchRpcQueryPack(connector, networkId, baseQueries)

  // now for each balance that includes nomPoolStaking, we need to fetch the metadata for the pool
  const nomPoolQueries = buildNomPoolQueries(networkId, partialBalances, miniMetadata)
  const balances = await fetchRpcQueryPack(connector, networkId, nomPoolQueries)

  return { success: balances, errors: [] }
}
