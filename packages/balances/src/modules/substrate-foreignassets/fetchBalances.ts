import log from "../../log"
import { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { fetchRpcQueryPack } from "../shared/rpcQueryPack"
import { getBalanceDefs } from "../shared/types"
import { buildQueries } from "./buildQueries"
import { MODULE_TYPE } from "./config"

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
  miniMetadata,
}) => {
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

  const queries = buildQueries(networkId, balanceDefs, miniMetadata)

  const balances = await fetchRpcQueryPack(connector, networkId, queries)

  return balanceDefs.reduce<FetchBalanceResults>(
    (acc, def) => {
      const balance = balances.find(
        (b) => b?.address === def.address && b?.tokenId === def.token.id,
      )
      if (balance) acc.success.push(balance)
      //if no entry consider empty balance
      else
        acc.success.push({
          address: def.address,
          networkId,
          tokenId: def.token.id,
          source: MODULE_TYPE,
          status: "live",
          values: [
            { type: "free", label: "free", amount: "0" },
            { type: "locked", label: "frozen", amount: "0" },
          ],
        })
      return acc
    },
    { success: [], errors: [] },
  )
}
