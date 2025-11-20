import type { bittensor } from "@polkadot-api/descriptors"
import type { IChainConnectorDot } from "@talismn/chain-connectors"
import {
  getCleanToken,
  SubDTaoToken,
  subDTaoTokenId,
  TokenSchema,
} from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { keyBy, uniq } from "lodash-es"

import log from "../../log"
import { AmountWithLabel, IBalance } from "../../types"
import { IBalanceModule } from "../../types/IBalanceModule"
import { fetchRuntimeCallResult, fetchStorageValue } from "../shared"
import { getBalanceDefs } from "../shared/types"
import { getScaledAlphaPrice } from "./alphaPrice"
import { MODULE_TYPE } from "./config"
import { SubDTaoBalanceMeta } from "./types"

type GetStakeInfosResult =
  (typeof bittensor)["descriptors"]["apis"]["StakeInfoRuntimeApi"]["get_stake_info_for_coldkeys"][1]
type GetDynamicInfosResult =
  (typeof bittensor)["descriptors"]["apis"]["SubnetInfoRuntimeApi"]["get_all_dynamic_info"][1]

const ROOT_NETUID = 0

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
  miniMetadata,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  if (!miniMetadata?.data) {
    log.warn(`MiniMetadata is required for fetching ${MODULE_TYPE} balances on ${networkId}.`, {
      tokensWithAddresses,
    })
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

  const addresses = uniq(balanceDefs.map((def) => def.address))

  try {
    const [stakeInfos, dynamicInfos] = await Promise.all([
      fetchRuntimeCallResult<GetStakeInfosResult>(
        connector,
        networkId,
        miniMetadata.data!,
        "StakeInfoRuntimeApi",
        "get_stake_info_for_coldkeys",
        [addresses],
      ),
      fetchRuntimeCallResult<GetDynamicInfosResult>(
        connector,
        networkId,
        miniMetadata.data!,
        "SubnetInfoRuntimeApi",
        "get_all_dynamic_info",
        [],
      ),
    ])

    const rootHotkeys = uniq(
      stakeInfos.flatMap(([, stakes]) =>
        stakes.filter((stake) => stake.netuid === ROOT_NETUID).map((stake) => stake.hotkey),
      ),
    )
    const _rootClaimableRatesByHotkey =
      rootHotkeys.length && miniMetadata.data
        ? await fetchRootClaimableRates(connector, networkId, miniMetadata.data, rootHotkeys)
        : new Map<string, Map<number, bigint>>()

    // console.log({ rootClaimableRatesByHotkey })

    const dynamicInfoByNetuid = keyBy(dynamicInfos.filter(isNotNil), (info) => info.netuid)

    const balances = stakeInfos.flatMap(([address, stakes]) =>
      stakes.map((stake) => {
        const dynamicInfo = dynamicInfoByNetuid[stake.netuid]
        const scaledAlphaPrice = dynamicInfo
          ? getScaledAlphaPrice(dynamicInfo.alpha_in, dynamicInfo.tao_in)
          : 0n

        return {
          address,
          tokenId: subDTaoTokenId(networkId, stake.netuid, stake.hotkey),
          baseTokenId: subDTaoTokenId(networkId, stake.netuid),
          stake: stake.stake,
          hotkey: stake.hotkey,
          netuid: stake.netuid,
          scaledAlphaPrice,
        }
      }),
    )

    const tokensById = keyBy(
      tokensWithAddresses.map(([token]) => token),
      (t) => t.id,
    )
    const dynamicTokens: SubDTaoToken[] = []

    // identify tokens that were not requested but have balances
    // BalanceProvider will be register them in ChaindataProvider at runtime, so they will be requested on next call
    for (const bal of balances) {
      if (!balanceDefs.some((def) => def.token.id === bal.tokenId)) {
        const baseToken = tokensById[bal.baseTokenId] as SubDTaoToken | undefined
        // define a token specific to this staking hotkey
        if (baseToken) {
          const cleanToken = getCleanToken(baseToken) as SubDTaoToken
          const newToken = TokenSchema.parse({
            ...cleanToken,
            id: bal.tokenId,
            hotkey: bal.hotkey,
          }) as SubDTaoToken
          dynamicTokens.push(newToken)
        }
      }
    }

    const success: IBalance[] = balanceDefs.map((def): IBalance => {
      const stake = balances.find((b) => b.address === def.address && b.tokenId === def.token.id)
      const meta: SubDTaoBalanceMeta = {
        scaledAlphaPrice: stake?.scaledAlphaPrice.toString() ?? "0",
      }

      const balanceValue: AmountWithLabel<string> = {
        type: "free",
        label: stake?.netuid === 0 ? "Root Staking" : `Subnet Staking`,
        amount: stake?.stake.toString() ?? "0",
        meta,
      }

      return {
        address: def.address,
        networkId,
        tokenId: def.token.id,
        source: MODULE_TYPE,
        status: "live",
        values: [balanceValue],
      }
    })

    return {
      success,
      errors: [],
      dynamicTokens,
    }
  } catch (err) {
    log.warn("Failed to fetch balances for substrate-dtao", { err })

    const errors = balanceDefs.map((def) => ({
      tokenId: def.token.id,
      address: def.address,
      error: new Error(`Failed to fetch balance for ${def.address} on ${networkId}`),
    }))

    return {
      success: [],
      errors,
    }
  }
}

const fetchRootClaimableRates = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  hotkeys: string[],
): Promise<Map<string, Map<number, bigint>>> => {
  if (!hotkeys.length) return new Map<string, Map<number, bigint>>()

  const entries = await Promise.all(
    hotkeys.map(async (hotkey) => {
      try {
        const rootClaimable = await fetchStorageValue<[number, bigint][] | null>(
          connector,
          networkId,
          metadataRpc,
          "SubtensorModule",
          "RootClaimable",
          [hotkey],
        )
        return [hotkey, rootClaimable ? new Map(rootClaimable) : new Map()] as const
      } catch (cause) {
        log.warn(`Failed to fetch RootClaimable for hotkey ${hotkey} on ${networkId}`, {
          cause,
        })
        return [hotkey, new Map<number, bigint>()] as const
      }
    }),
  )

  return new Map(entries)
}
