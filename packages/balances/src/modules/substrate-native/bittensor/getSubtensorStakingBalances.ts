import { ChainConnector } from "@talismn/chain-connector"
import { DotNetworkId } from "@talismn/chaindata-provider"
import { fromPairs, toPairs, uniq, values } from "lodash"
import { from, Observable, of, switchMap, timer } from "rxjs"
import { withRetry } from "viem"

import { AmountWithLabel } from "../../../types"
import { BalanceDef, fetchRuntimeCallResult, ModuleMiniMetadata } from "../../shared"
import { MiniMetadataExtra } from "../config"
import {
  calculateTaoFromDynamicInfo,
  GetDynamicInfoResult,
  GetStakeInfoForColdkeyResult,
  ONE_ALPHA_TOKEN,
  SUBTENSOR_MIN_STAKE_AMOUNT_PLANK,
  SUBTENSOR_ROOT_NETUID,
} from "./subtensor"

// per address, lists of values to add to the native balance
type StakingValuesByAddress = Record<string, Array<AmountWithLabel<string>>>

export const getSubtensorStakingBalances$ = (
  connector: ChainConnector,
  networkId: DotNetworkId,
  balanceDefs: BalanceDef<"substrate-native">[],
  miniMetadata: ModuleMiniMetadata<MiniMetadataExtra>,
): Observable<StakingValuesByAddress> => {
  const addresses = balanceDefs.map((def) => def.address)
  const token = balanceDefs[0].token

  if (!addresses.length || !token || !miniMetadata.extra.hasSubtensorPallet || !miniMetadata.data)
    return of({})

  // we are only doing runtime calls, there is no way to subscribe to changes, except polling
  // => start immediately, then repeat every 30 seconds
  return timer(0, 30000).pipe(
    switchMap(() =>
      from(fetchStakeInfoByAddress(connector, networkId, miniMetadata, addresses)).pipe(
        switchMap((stakeInfoByAddress) =>
          fetchStakingBalanceValuesByAddress(
            connector,
            networkId,
            miniMetadata,
            stakeInfoByAddress,
          ),
        ),
      ),
    ),
  )
}

const fetchStakingBalanceValuesByAddress = async (
  connector: ChainConnector,
  networkId: DotNetworkId,
  miniMetadata: ModuleMiniMetadata<MiniMetadataExtra>,
  stakeInfoByAddress: Record<string, GetStakeInfoForColdkeyResult>,
) => {
  const uniqueNetuids = uniq(
    values(stakeInfoByAddress).flatMap((infos) => infos.map((info) => info.netuid)),
  ).filter((netuid) => netuid !== SUBTENSOR_ROOT_NETUID)

  const dynamicInfoByNetuid = await fetchDynamicInfoByNetuid(
    connector,
    networkId,
    miniMetadata,
    uniqueNetuids,
  )

  return fromPairs(
    toPairs(stakeInfoByAddress).map(([address, stakeInfos]) => {
      const stakesBalances = stakeInfos
        .filter(({ stake }) => stake >= SUBTENSOR_MIN_STAKE_AMOUNT_PLANK)
        .map(({ hotkey, netuid, stake }) => ({
          hotkey,
          netuid: Number(netuid),
          stake: BigInt(stake),
          dynamicInfo: dynamicInfoByNetuid[Number(netuid)],
        }))
        .map(({ hotkey, stake, netuid, dynamicInfo }) => {
          const { token_symbol, subnet_name, subnet_identity } = dynamicInfo ?? {}
          const tokenSymbol = new TextDecoder().decode(Uint8Array.from(token_symbol ?? []))
          const subnetName = new TextDecoder().decode(Uint8Array.from(subnet_name ?? []))

          const subnetIdentity = subnet_identity
            ? fromPairs(
                toPairs(subnet_identity).map(
                  ([key, binary]) => [key, binary.asText()] as [string, string],
                ),
              )
            : undefined

          // Add 1n balance if failed to fetch dynamic info, so the position is not ignored by Balance lib and is displayed in the UI.
          const alphaStakedInTao = dynamicInfo
            ? calculateTaoFromDynamicInfo({
                dynamicInfo,
                alphaStaked: stake,
              })
            : 1n

          const alphaToTaoRate = calculateTaoFromDynamicInfo({
            dynamicInfo: dynamicInfo ?? null,
            alphaStaked: ONE_ALPHA_TOKEN,
          }).toString()

          const stakeByNetuid = Number(netuid) === SUBTENSOR_ROOT_NETUID ? stake : alphaStakedInTao

          const balanceValue: AmountWithLabel<string> = {
            source: "subtensor-staking",
            type: "subtensor",
            label: "subtensor-staking",
            amount: stakeByNetuid.toString(),
            meta: {
              type: "subtensor-staking",
              hotkey,
              netuid,
              amountStaked: stake.toString(),
              alphaToTaoRate,
              dynamicInfo: {
                tokenSymbol,
                subnetName,
                subnetIdentity: {
                  ...subnetIdentity,
                  subnetName: subnetIdentity?.subnet_name || subnetName,
                },
              },
            },
          }

          return balanceValue
        })

      return [address, stakesBalances]
    }),
  )
}

const fetchStakeInfoByAddress = async (
  connector: ChainConnector,
  networkId: DotNetworkId,
  miniMetadata: ModuleMiniMetadata<MiniMetadataExtra>,
  addresses: string[],
) => {
  const pairs = await Promise.all(
    addresses.map(
      async (address) =>
        [
          address,
          await withRetry(
            () =>
              fetchRuntimeCallResult<GetStakeInfoForColdkeyResult>(
                connector,
                networkId,
                miniMetadata.data!,
                "StakeInfoRuntimeApi",
                "get_stake_info_for_coldkey",
                [address],
              ),
            { delay: 500, retryCount: 3 },
          ),
        ] as [string, GetStakeInfoForColdkeyResult],
    ),
  )

  return fromPairs(pairs) as Record<string, GetStakeInfoForColdkeyResult>
}

// assume dynamic info doesnt change over the course of a browser session
const dynamicInfoCache = new Map<string, GetDynamicInfoResult>()
const getCacheKey = (networkId: DotNetworkId, netuid: number) => `${networkId}:${netuid}`

const fetchDynamicInfoByNetuid = async (
  connector: ChainConnector,
  networkId: DotNetworkId,
  miniMetadata: ModuleMiniMetadata<MiniMetadataExtra>,
  uniqueNetuids: number[],
) => {
  const fetchInfo = async (netuid: number): Promise<GetDynamicInfoResult | null | undefined> => {
    if (netuid === SUBTENSOR_ROOT_NETUID) return null

    const cacheKey = getCacheKey(networkId, netuid)

    if (!dynamicInfoCache.has(cacheKey)) {
      await withRetry(
        async () => {
          const result = await fetchRuntimeCallResult<GetDynamicInfoResult>(
            connector,
            networkId,
            miniMetadata.data!,
            "SubnetInfoRuntimeApi",
            "get_dynamic_info",
            [netuid],
          )

          dynamicInfoCache.set(cacheKey, result) // Cache successful response

          return result
        },
        { delay: 500, retryCount: 3 },
      )
    }

    return dynamicInfoCache.get(cacheKey) ?? null
  }

  const results = await Promise.all(
    uniqueNetuids.map(
      async (netuid) =>
        [netuid, await fetchInfo(netuid)] as [number, GetDynamicInfoResult | null | undefined],
    ),
  )

  return fromPairs(results) as Record<number, GetDynamicInfoResult | null | undefined>
}
