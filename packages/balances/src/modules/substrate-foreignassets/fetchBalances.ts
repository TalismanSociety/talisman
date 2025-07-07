import { AnyMiniMetadata } from "@talismn/chaindata-provider"
import { decodeScale, papiParse } from "@talismn/scale"
import { isNotNil } from "@talismn/util"

import log from "../../log"
import { AmountWithLabel, IBalance } from "../../types"
import { FetchBalanceResults, IBalanceModule } from "../IBalanceModule"
import { BalanceDef, getBalanceDefs } from "../shared/types"
import { buildNetworkStorageCoders, RpcStateQuery, RpcStateQueryHelper } from "../util"
import { MODULE_TYPE } from "./config"

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  addressesByToken,
  connector,
  miniMetadata,
}) => {
  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(addressesByToken)

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

  const queries = buildQueries(networkId, balanceDefs, miniMetadata)

  const balances = await new RpcStateQueryHelper(connector, queries).fetch()

  return balanceDefs.reduce(
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
    { success: [], errors: [] } as FetchBalanceResults,
  )
}

const buildQueries = (
  networkId: string,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[],
  miniMetadata: AnyMiniMetadata,
): Array<RpcStateQuery<IBalance>> => {
  const networkStorageCoders = buildNetworkStorageCoders(networkId, miniMetadata, {
    storage: ["ForeignAssets", "Account"],
  })

  return balanceDefs
    .map(({ token, address }): RpcStateQuery<IBalance> | null => {
      const scaleCoder = networkStorageCoders?.storage

      const getStateKey = (onChainId: string) => {
        try {
          return scaleCoder?.keys?.enc?.(papiParse(onChainId), address)
        } catch {
          return null
        }
      }

      const stateKey = getStateKey(token.onChainId)

      if (!stateKey) {
        log.warn(
          `Invalid assetId / address in ${networkId} storage query ${token.onChainId} / ${address}`,
        )
        return null
      }

      const decodeResult = (change: string | null) => {
        /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
        type DecodedType = {
          balance?: bigint
          is_frozen?: boolean // most likely not used
          reason?: { type?: "Sufficient" }
          status?: { type?: "Liquid" } | { type?: "Frozen" }
          extra?: undefined
        }

        const decoded = decodeScale<DecodedType>(
          scaleCoder,
          change,
          `Failed to decode substrate-assets balance on chain ${networkId}`,
        ) ?? {
          balance: 0n,
          is_frozen: false,
          reason: { type: "Sufficient" },
          status: { type: "Liquid" },
          extra: undefined,
        }

        const isFrozen = decoded.is_frozen ?? decoded?.status?.type === "Frozen"
        const amount = (decoded?.balance ?? 0n).toString()

        // due to the following balance calculations, which are made in the `Balance` type:
        //
        // total balance        = (free balance) + (reserved balance)
        // transferable balance = (free balance) - (frozen balance)
        //
        // when `isFrozen` is true we need to set **both** the `free` and `frozen` amounts
        // of this balance to the value we received from the RPC.
        //
        // if we only set the `frozen` amount, then the `total` calculation will be incorrect!
        const free = amount
        const frozen = token.isFrozen || isFrozen ? amount : "0"

        // include balance values even if zero, so that newly-zero values overwrite old values
        const balanceValues: Array<AmountWithLabel<string>> = [
          { type: "free", label: "free", amount: free.toString() },
          { type: "locked", label: "frozen", amount: frozen.toString() },
        ]

        const balance: IBalance = {
          source: "substrate-assets",
          status: "live",
          address,
          networkId,
          tokenId: token.id,
          values: balanceValues,
        }

        return balance
      }

      return {
        chainId: networkId,
        stateKey,
        decodeResult,
      }
    })
    .filter(isNotNil)
}
