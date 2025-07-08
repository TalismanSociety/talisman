import { decodeScale, papiParse } from "@talismn/scale"
import { isNotNil } from "@talismn/util"

import log from "../../log"
import { AmountWithLabel, IBalance } from "../../types"
import { FetchBalanceResults, IBalanceModule } from "../IBalanceModule"
import { BalanceDef, getBalanceDefs, ModuleMiniMetadata } from "../shared/types"
import { buildNetworkStorageCoders, RpcStateQuery, RpcStateQueryHelper } from "../util"
import { MiniMetadataExtra, MODULE_TYPE, ModuleConfig, TokenConfig } from "./config"

export const fetchBalances: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig,
  MiniMetadataExtra
>["fetchBalances"] = async ({ networkId, tokensWithAddresses, connector, miniMetadata }) => {
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
  miniMetadata: ModuleMiniMetadata<MiniMetadataExtra>,
): Array<RpcStateQuery<IBalance>> => {
  const networkStorageCoders = buildNetworkStorageCoders(networkId, miniMetadata, {
    storage: [miniMetadata.extra.palletId, "Accounts"],
  })

  return balanceDefs
    .map(({ token, address }): RpcStateQuery<IBalance> | null => {
      const scaleCoder = networkStorageCoders?.storage

      const getStateKey = (onChainId: string | number) => {
        try {
          return scaleCoder!.keys.enc(address, papiParse(onChainId))
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
          free?: bigint
          reserved?: bigint
          frozen?: bigint
        }

        const decoded = decodeScale<DecodedType>(
          scaleCoder,
          change,
          `Failed to decode substrate-tokens balance on chain ${networkId}`,
        ) ?? { free: 0n, reserved: 0n, frozen: 0n }

        const free = (decoded?.free ?? 0n).toString()
        const reserved = (decoded?.reserved ?? 0n).toString()
        const frozen = (decoded?.frozen ?? 0n).toString()

        const balanceValues: Array<AmountWithLabel<string>> = [
          { type: "free", label: "free", amount: free.toString() },
          { type: "reserved", label: "reserved", amount: reserved.toString() },
          { type: "locked", label: "frozen", amount: frozen.toString() },
        ]

        return {
          source: "substrate-tokens",
          status: "live",
          address,
          networkId,
          tokenId: token.id,
          values: balanceValues,
        } as IBalance
      }

      return {
        chainId: networkId,
        stateKey,
        decodeResult,
      }
    })
    .filter(isNotNil)
}
