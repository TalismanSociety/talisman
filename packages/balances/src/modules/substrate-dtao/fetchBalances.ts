import { SubDTaoToken, subDTaoTokenId } from "@talismn/chaindata-provider"
import { keyBy, uniq } from "lodash-es"
import { SS58String } from "polkadot-api"

import log from "../../log"
import { IBalance } from "../../types"
import { IBalanceModule } from "../../types/IBalanceModule"
import { fetchRuntimeCallResult } from "../shared"
import { getBalanceDefs } from "../shared/types"
import { MODULE_TYPE } from "./config"

type StakeInfo = {
  netuid: number
  emission: bigint
  hotkey: SS58String
  coldkey: SS58String
  stake: bigint
  locked: bigint
  tao_emission: bigint
  drain: bigint
  is_registered: boolean
}

type StakeInfos = [SS58String, StakeInfo[]][]

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
    const res = await fetchRuntimeCallResult<StakeInfos>(
      connector,
      networkId,
      miniMetadata.data!,
      "StakeInfoRuntimeApi",
      "get_stake_info_for_coldkeys",
      [addresses],
    )

    const balances = res.flatMap(([address, stakes]) =>
      stakes.map((stake) => ({
        address,
        tokenId: subDTaoTokenId(networkId, stake.netuid, stake.hotkey),
        baseTokenId: subDTaoTokenId(networkId, stake.netuid),
        stake: stake.stake,
        hotkey: stake.hotkey,
      })),
    )

    const tokensById = keyBy(
      tokensWithAddresses.map(([token]) => token),
      (t) => t.id,
    )
    const newTokens: SubDTaoToken[] = []

    // register tokens that were not requested but have balances
    for (const bal of balances) {
      if (!balanceDefs.some((def) => def.token.id === bal.tokenId)) {
        const baseToken = tokensById[bal.baseTokenId] as SubDTaoToken | undefined
        // define a token specific to this staking hotkey
        if (baseToken) newTokens.push({ ...baseToken, id: bal.tokenId, hotkey: bal.hotkey })
      }
    }

    const success: IBalance[] = balanceDefs.map((def): IBalance => {
      const stake = balances.find((b) => b.address === def.address && b.tokenId === def.token.id)

      return {
        address: def.address,
        networkId,
        tokenId: def.token.id,
        source: MODULE_TYPE,
        status: "live",
        value: stake?.stake.toString() ?? "0",
      }
    })

    return {
      success,
      errors: [],
      newTokens,
    }
  } catch (err) {
    log.warn("Failed to fetch balances for substrate-dtao", err)

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
