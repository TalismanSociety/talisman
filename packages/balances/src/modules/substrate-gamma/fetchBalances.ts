import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { subGammaTokenId } from "@talismn/chaindata-provider"
import { uniq } from "lodash-es"

import log from "../../log"
import type { IBalance } from "../../types"
import type { FetchBalanceErrors, IBalanceModule } from "../../types/IBalanceModule"
import { fetchBestBlockHash, getBalanceDefs } from "../shared"
import type { BalanceDef } from "../shared/types"
import { fetchMetadataRpcAt, fetchOwnedGammaDeposits } from "./chain"
import { MODULE_TYPE } from "./config"
import { toGammaBalance } from "./deposits"
import { toGammaToken } from "./fetchTokens"
import { getMiniMetadata } from "./getMiniMetadata"

type GammaBalanceDef = BalanceDef<typeof MODULE_TYPE>

const toErrors = (defs: GammaBalanceDef[], error: Error): FetchBalanceErrors =>
  defs.map((def) => ({ tokenId: def.token.id, address: def.address, error }))

const upgradedMetadataRpcs = new Map<string, { specVersion: number; data: `0x${string}` | null }>()

const getUpgradedMetadataRpc = async (
  connector: IChainConnectorDot,
  networkId: string,
  specVersion: number,
  at: `0x${string}`
) => {
  const cached = upgradedMetadataRpcs.get(networkId)
  if (cached?.specVersion === specVersion) return cached.data

  const metadataRpc = await fetchMetadataRpcAt(connector, networkId, at)
  const { data } = getMiniMetadata({ networkId, specVersion, metadataRpc })
  upgradedMetadataRpcs.set(networkId, { specVersion, data })
  log.info(`Built ${MODULE_TYPE} metadata for spec ${specVersion} on ${networkId}`)
  return data
}

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
  miniMetadata,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)
  const failAll = (error: Error) => ({ success: [], errors: toErrors(balanceDefs, error) })

  if (!miniMetadata?.data)
    return failAll(new Error("Minimetadata is required for fetching balances"))
  if (miniMetadata.source !== MODULE_TYPE)
    return failAll(new Error(`Invalid request: miniMetadata source is not ${MODULE_TYPE}`))
  if (miniMetadata.chainId !== networkId)
    return failAll(new Error(`Invalid request: Expected chainId is ${networkId}`))

  try {
    const at = await fetchBestBlockHash(connector, networkId)
    const { specVersion } = await connector.send<{ specVersion: number }>(
      networkId,
      "state_getRuntimeVersion",
      [at]
    )
    const metadataRpc =
      specVersion === miniMetadata.specVersion
        ? miniMetadata.data
        : await getUpgradedMetadataRpc(connector, networkId, specVersion, at)
    if (!metadataRpc)
      return failAll(new Error(`Spec ${specVersion} of ${networkId} has no ${MODULE_TYPE} support`))

    const depositsByColdkey = await fetchOwnedGammaDeposits({
      connector,
      networkId,
      metadataRpc,
      coldkeys: uniq(balanceDefs.map((def) => def.address)),
      at,
    })

    const success: IBalance[] = []
    const errors: FetchBalanceErrors = []
    for (const def of balanceDefs) {
      const deposits = depositsByColdkey.get(def.address)
      if (deposits instanceof Error) {
        errors.push({ tokenId: def.token.id, address: def.address, error: deposits })
        continue
      }
      const balance = toGammaBalance(
        def.address,
        def.token.id,
        (deposits ?? []).filter(({ netuid }) => netuid === def.token.netuid)
      )
      if (balance) success.push(balance)
    }

    const requestedTokenIds = new Set(balanceDefs.map((def) => def.token.id))
    const unknownNetuids = new Set(
      [...depositsByColdkey.values()]
        .flatMap((deposits) => (deposits instanceof Error ? [] : deposits))
        .filter(
          ({ netuid, balance }) =>
            balance > 0n && !requestedTokenIds.has(subGammaTokenId(networkId, netuid))
        )
        .map(({ netuid }) => netuid)
    )

    return {
      success,
      errors,
      dynamicTokens: [...unknownNetuids].map((netuid) => toGammaToken(networkId, { netuid })),
    }
  } catch (err) {
    log.warn(`Failed to fetch balances for ${MODULE_TYPE}`, { err })
    return failAll(
      new Error(`Failed to fetch ${MODULE_TYPE} balances on ${networkId}`, { cause: err })
    )
  }
}
