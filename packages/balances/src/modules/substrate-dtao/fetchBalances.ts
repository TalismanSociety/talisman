import type { IChainConnectorDot } from "@talismn/chain-connectors"
import {
  getCleanToken,
  SubDTaoToken,
  subDTaoTokenId,
  TokenSchema,
} from "@talismn/chaindata-provider"
import { decodeScale, parseMetadataRpc } from "@talismn/scale"
import { isNotNil } from "@talismn/util"
import { keyBy, uniq } from "lodash-es"
import { from, lastValueFrom, map, of, switchMap } from "rxjs"

import log from "../../log"
import { AmountWithLabel, IBalance } from "../../types"
import { IBalanceModule } from "../../types/IBalanceModule"
import { fetchRuntimeCallResult } from "../shared"
import { fetchRpcQueryPack, MaybeStateKey, RpcQueryPack } from "../shared/rpcQueryPack"
import { getBalanceDefs } from "../shared/types"
import { getScaledAlphaPrice } from "./alphaPrice"
import { calculatePendingRootClaimable } from "./calculatePendingRootClaimable"
import { MODULE_TYPE } from "./config"
import {
  GetDynamicInfosResult,
  GetStakeInfosResult,
  SubDTaoBalance,
  SubDTaoBalanceMeta,
} from "./types"

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
    // Convert Promise.all to Observable chain for better composability and cancellation support
    const result = await lastValueFrom(
      from(
        Promise.all([
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
        ]),
      ).pipe(
        switchMap(([stakeInfos, dynamicInfos]) => {
          const rootHotkeys = uniq(
            stakeInfos.flatMap(([, stakes]) =>
              stakes.filter((stake) => stake.netuid === ROOT_NETUID).map((stake) => stake.hotkey),
            ),
          )

          // Step 2: Fetch root claimable rates (depends on Step 1)
          const rootClaimableRates$ =
            rootHotkeys.length && miniMetadata.data
              ? from(fetchRootClaimableRates(connector, networkId, miniMetadata.data, rootHotkeys))
              : of(new Map<string, Map<number, bigint>>())

          return rootClaimableRates$.pipe(
            switchMap((rootClaimableRatesByHotkey) => {
              // Collect all (address, hotkey, netuid) pairs for root stakes to fetch RootClaimed amounts
              const addressHotkeyNetuidPairs: Array<
                [address: string, hotkey: string, netuid: number]
              > = []
              for (const [address, stakes] of stakeInfos) {
                for (const stake of stakes) {
                  if (stake.netuid === ROOT_NETUID) {
                    const claimableRates = rootClaimableRatesByHotkey.get(stake.hotkey)
                    if (claimableRates) {
                      // For each netuid that has a claimable rate, we need to check RootClaimed
                      for (const netuid of claimableRates.keys()) {
                        addressHotkeyNetuidPairs.push([address, stake.hotkey, netuid])
                      }
                    }
                  }
                }
              }

              // Step 3: Fetch root claimed amounts (depends on Step 1 and Step 2)
              const rootClaimedAmounts$ =
                addressHotkeyNetuidPairs.length && miniMetadata.data
                  ? from(
                      fetchRootClaimedAmounts(
                        connector,
                        networkId,
                        miniMetadata.data,
                        addressHotkeyNetuidPairs,
                      ),
                    )
                  : of(new Map<string, Map<string, Map<number, bigint>>>())

              return rootClaimedAmounts$.pipe(
                map((rootClaimedAmounts) => ({
                  stakeInfos,
                  dynamicInfos,
                  rootClaimableRatesByHotkey,
                  rootClaimedAmounts,
                })),
              )
            }),
          )
        }),
      ),
    )

    const { stakeInfos, dynamicInfos, rootClaimableRatesByHotkey, rootClaimedAmounts } = result

    const dynamicInfoByNetuid = keyBy(dynamicInfos.filter(isNotNil), (info) => info.netuid)

    // Upserts a balance into the accumulator, merging stake values if the balance already exists.
    // Eg: Acc X has root staked with validator Y, but also staked on sn 45 with the same validator Y.
    // We merge the pending root claim of sn 45 and the sn 45 stake in the same balance.
    const upsertBalance = (
      acc: Record<string, SubDTaoBalance>,
      address: string,
      tokenId: string,
      balance: SubDTaoBalance,
    ): void => {
      const key = `${address}:${tokenId}`
      const recordedBalance = acc[key]
      if (recordedBalance) {
        acc[key] = {
          ...recordedBalance,
          stake: recordedBalance.stake + balance.stake,
          // If the new balance has pendingRootClaim, use it (it's calculated from current state)
          ...(balance.pendingRootClaim !== undefined && {
            pendingRootClaim: balance.pendingRootClaim,
          }),
        }
      } else {
        acc[key] = balance
      }
    }

    const balancesRaw = stakeInfos.reduce<Record<string, SubDTaoBalance>>(
      (acc, [address, stakes]) => {
        for (const stake of stakes) {
          // Regular stake cases
          const dynamicInfo = dynamicInfoByNetuid[stake.netuid]
          const scaledAlphaPrice = dynamicInfo
            ? getScaledAlphaPrice(dynamicInfo.alpha_in, dynamicInfo.tao_in)
            : 0n

          const balance: SubDTaoBalance = {
            address,
            tokenId: subDTaoTokenId(networkId, stake.netuid, stake.hotkey),
            baseTokenId: subDTaoTokenId(networkId, stake.netuid),
            stake: stake.stake,
            hotkey: stake.hotkey,
            netuid: stake.netuid,
            scaledAlphaPrice,
          }

          upsertBalance(acc, address, balance.tokenId, balance)

          // Root stake cases, we need to calculate the pending root claim and add to the balances
          if (stake.netuid === ROOT_NETUID) {
            const claimableRates = rootClaimableRatesByHotkey.get(stake.hotkey) ?? new Map()
            const alreadyClaimedMap =
              rootClaimedAmounts.get(address)?.get(stake.hotkey) ?? new Map<number, bigint>()

            const pendingRootClaimBalances = calculatePendingRootClaimable({
              stake: stake.stake,
              hotkey: stake.hotkey,
              address,
              networkId,
              validatorRootClaimableRate: claimableRates,
              dynamicInfoByNetuid,
              alreadyClaimedByNetuid: alreadyClaimedMap,
            })
            pendingRootClaimBalances.forEach((balance) => {
              upsertBalance(acc, address, balance.tokenId, balance)
            })
          }
        }
        return acc
      },
      {},
    )

    const balances = Object.values(balancesRaw)

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

      const stakeAmount = BigInt(stake?.stake?.toString() ?? "0")
      const pendingRootClaimAmount = BigInt(stake?.pendingRootClaim?.toString() ?? "0")
      const hasZeroStake = stakeAmount === 0n
      const hasPendingRootClaim = pendingRootClaimAmount > 0n

      const balanceValue: AmountWithLabel<string> = {
        type: "free",
        label: stake?.netuid === 0 ? "Root Staking" : `Subnet Staking`,
        amount: stakeAmount.toString(),
        meta,
      }

      const pendingRootClaimValue: AmountWithLabel<string> = {
        type: "locked",
        label: "Pending root claim",
        amount: pendingRootClaimAmount.toString(),
        meta,
      }

      const values: Array<AmountWithLabel<string>> = [balanceValue, pendingRootClaimValue]

      // If stake is 0n but there's a pendingRootClaim, add it as an extra amount
      // with includeInTotal: true so it counts toward the total balance.
      // This ensures the balance isn't filtered out when stake is 0n.
      // The total.planck calculation is: free + reserved + extra (with includeInTotal: true)
      // So by adding pendingRootClaim as extra, it will be included in total.planck.
      if (hasZeroStake && hasPendingRootClaim) {
        values.push({
          type: "extra",
          label: "Pending root claim",
          amount: pendingRootClaimAmount.toString(),
          includeInTotal: true,
          meta,
        })
      }

      return {
        address: def.address,
        networkId,
        tokenId: def.token.id,
        source: MODULE_TYPE,
        status: "live",
        values,
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

const buildStorageCoder = (metadataRpc: `0x${string}`, pallet: string, entry: string) => {
  const { builder } = parseMetadataRpc(metadataRpc)
  return builder.buildStorage(pallet, entry)
}

const buildRootClaimableStorageCoder = (
  networkId: string,
  metadataRpc: `0x${string}` | null,
): ReturnType<ReturnType<typeof parseMetadataRpc>["builder"]["buildStorage"]> | null => {
  let storageCoder: ReturnType<typeof buildStorageCoder> | null = null

  if (metadataRpc) {
    try {
      storageCoder = buildStorageCoder(metadataRpc, "SubtensorModule", "RootClaimable")
    } catch (cause) {
      log.warn(
        `Failed to build storage coder for SubtensorModule.RootClaimable using provided metadata on ${networkId}`,
        { cause },
      )
    }
  }

  return storageCoder
}

const buildRootClaimedStorageCoder = (
  networkId: string,
  metadataRpc: `0x${string}` | null,
): ReturnType<ReturnType<typeof parseMetadataRpc>["builder"]["buildStorage"]> | null => {
  let storageCoder: ReturnType<typeof buildStorageCoder> | null = null

  if (metadataRpc) {
    try {
      storageCoder = buildStorageCoder(metadataRpc, "SubtensorModule", "RootClaimed")
    } catch (cause) {
      log.warn(
        `Failed to build storage coder for SubtensorModule.RootClaimed using provided metadata on ${networkId}`,
        { cause },
      )
    }
  }

  return storageCoder
}

const buildRootClaimableQueries = (
  networkId: string,
  hotkeys: string[],
  storageCoder: ReturnType<ReturnType<typeof parseMetadataRpc>["builder"]["buildStorage"]>,
): Array<RpcQueryPack<[string, Map<number, bigint>]>> => {
  return hotkeys.map((hotkey) => {
    let stateKey: MaybeStateKey = null
    try {
      stateKey = storageCoder.keys.enc(hotkey) as MaybeStateKey
    } catch (cause) {
      log.warn(`Failed to encode storage key for hotkey ${hotkey} on ${networkId}`, { cause })
    }

    const decodeResult = (changes: MaybeStateKey[]): [string, Map<number, bigint>] => {
      const hexValue = changes[0]
      if (!hexValue) {
        return [hotkey, new Map<number, bigint>()]
      }

      const decoded = decodeScale<[number, bigint][] | null>(
        storageCoder,
        hexValue,
        `Failed to decode RootClaimable for hotkey ${hotkey} on ${networkId}`,
      )
      return [hotkey, decoded ? new Map(decoded) : new Map<number, bigint>()]
    }

    return {
      stateKeys: [stateKey],
      decodeResult,
    }
  })
}

const fetchRootClaimableRates = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  hotkeys: string[],
): Promise<Map<string, Map<number, bigint>>> => {
  if (!hotkeys.length) return new Map<string, Map<number, bigint>>()

  const storageCoder = buildRootClaimableStorageCoder(networkId, metadataRpc)
  if (!storageCoder) {
    // Fallback: return empty map for all hotkeys
    return new Map(hotkeys.map((hotkey) => [hotkey, new Map<number, bigint>()]))
  }

  const queries = buildRootClaimableQueries(networkId, hotkeys, storageCoder)

  try {
    const results = await fetchRpcQueryPack(connector, networkId, queries)
    return new Map(results)
  } catch (cause) {
    log.warn(`Failed to fetch RootClaimable for hotkeys on ${networkId}`, { cause })
    // Fallback: return empty map for all hotkeys
    return new Map(hotkeys.map((hotkey) => [hotkey, new Map<number, bigint>()]))
  }
}

const buildRootClaimedQueries = (
  networkId: string,
  addressHotkeyNetuidPairs: Array<[address: string, hotkey: string, netuid: number]>,
  storageCoder: ReturnType<ReturnType<typeof parseMetadataRpc>["builder"]["buildStorage"]>,
): Array<RpcQueryPack<[string, string, number, bigint]>> => {
  return addressHotkeyNetuidPairs.map(([address, hotkey, netuid]) => {
    let stateKey: MaybeStateKey = null
    try {
      // RootClaimed storage takes params: [netuid, hotkey, coldkey_ss58]
      stateKey = storageCoder.keys.enc(netuid, hotkey, address) as MaybeStateKey
    } catch (cause) {
      log.warn(
        `Failed to encode storage key for RootClaimed (netuid=${netuid}, hotkey=${hotkey}, address=${address}) on ${networkId}`,
        { cause },
      )
    }

    const decodeResult = (changes: MaybeStateKey[]): [string, string, number, bigint] => {
      const hexValue = changes[0]
      if (!hexValue) {
        return [address, hotkey, netuid, 0n]
      }

      const decoded = decodeScale<bigint | null>(
        storageCoder,
        hexValue,
        `Failed to decode RootClaimed for (netuid=${netuid}, hotkey=${hotkey}, address=${address}) on ${networkId}`,
      )
      return [address, hotkey, netuid, decoded ?? 0n]
    }

    return {
      stateKeys: [stateKey],
      decodeResult,
    }
  })
}

const fetchRootClaimedAmounts = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  addressHotkeyNetuidPairs: Array<[address: string, hotkey: string, netuid: number]>,
): Promise<Map<string, Map<string, Map<number, bigint>>>> => {
  if (!addressHotkeyNetuidPairs.length) {
    return new Map<string, Map<string, Map<number, bigint>>>()
  }

  const storageCoder = buildRootClaimedStorageCoder(networkId, metadataRpc)
  if (!storageCoder) {
    // Fallback: return empty map for all pairs
    const result = new Map<string, Map<string, Map<number, bigint>>>()
    for (const [address, hotkey, netuid] of addressHotkeyNetuidPairs) {
      if (!result.has(address)) result.set(address, new Map())
      const addressMap = result.get(address)!
      if (!addressMap.has(hotkey)) addressMap.set(hotkey, new Map())
      addressMap.get(hotkey)!.set(netuid, 0n)
    }
    return result
  }

  const queries = buildRootClaimedQueries(networkId, addressHotkeyNetuidPairs, storageCoder)

  try {
    const results = await fetchRpcQueryPack(connector, networkId, queries)
    // Build a nested map: address -> hotkey -> netuid -> claimed amount
    const result = new Map<string, Map<string, Map<number, bigint>>>()
    for (const [address, hotkey, netuid, claimed] of results) {
      if (!result.has(address)) result.set(address, new Map())
      const addressMap = result.get(address)!
      if (!addressMap.has(hotkey)) addressMap.set(hotkey, new Map())
      addressMap.get(hotkey)!.set(netuid, claimed)
    }
    return result
  } catch (cause) {
    log.warn(`Failed to fetch RootClaimed for address-hotkey-netuid pairs on ${networkId}`, {
      cause,
    })
    // Fallback: return empty map for all pairs
    const result = new Map<string, Map<string, Map<number, bigint>>>()
    for (const [address, hotkey, netuid] of addressHotkeyNetuidPairs) {
      if (!result.has(address)) result.set(address, new Map())
      const addressMap = result.get(address)!
      if (!addressMap.has(hotkey)) addressMap.set(hotkey, new Map())
      addressMap.get(hotkey)!.set(netuid, 0n)
    }
    return result
  }
}
