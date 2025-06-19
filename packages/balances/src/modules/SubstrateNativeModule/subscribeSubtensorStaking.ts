import { ChainConnector } from "@talismn/chain-connector"
import {
  ChaindataProvider,
  DotNetworkId,
  parseTokenId,
  SubNativeToken,
} from "@talismn/chaindata-provider"
import { getScaleApi } from "@talismn/sapi"
import { isEthereumAddress } from "@talismn/util"
import { keys } from "lodash"
import { Binary, SS58String } from "polkadot-api"
import { exhaustMap, from, interval, map, mergeMap, startWith, toArray } from "rxjs"

import type { SubNativeModule } from "./index"
import { getMiniMetadata } from "../../getMiniMetadata"
import log from "../../log"
import { AddressesByToken, MiniMetadata, SubscriptionCallback } from "../../types"
import { getUniqueChainIds } from "../util"
import { SubNativeBalance } from "./types"
import {
  calculateTaoFromDynamicInfo,
  GetDynamicInfoParams,
  GetDynamicInfoResult,
  GetStakeInfoForColdkeyParams,
  GetStakeInfoForColdkeyResult,
  ONE_ALPHA_TOKEN,
  SUBTENSOR_MIN_STAKE_AMOUNT_PLANK,
  SUBTENSOR_ROOT_NETUID,
} from "./util/subtensor"

// TODO make this method chain-specific
export async function subscribeSubtensorStaking(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<SubNativeToken>,
  callback: SubscriptionCallback<SubNativeBalance[]>,
  signal?: AbortSignal,
) {
  const allChains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()

  // there should be only one network here when subscribing to balances, we've split it up by network at the top level
  const networkIds = keys(addressesByToken).map((tokenId) => parseTokenId(tokenId).networkId)

  const miniMetadatas = new Map<DotNetworkId, MiniMetadata<typeof SubNativeModule>>()
  for (const networkId of networkIds) {
    const miniMetadata = await getMiniMetadata(
      chaindataProvider,
      chainConnector,
      networkId,
      "substrate-native",
    )
    miniMetadatas.set(networkId, miniMetadata)
  }

  signal?.throwIfAborted()

  const subtensorTokenIds = Object.entries(tokens)
    .filter(([, token]) => {
      // ignore non-native tokens
      if (token.type !== "substrate-native") return false
      // ignore tokens on chains with no subtensor pallet
      const miniMetadata = miniMetadatas.get(token.networkId)
      return miniMetadata?.extra?.hasSubtensorPallet === true
    })
    .map(([tokenId]) => tokenId)

  // staking can only be done by the native token on chains with the subtensor pallet
  const addressesBySubtensorToken = Object.fromEntries(
    Object.entries(addressesByToken)
      // remove ethereum addresses
      .map(([tokenId, addresses]): [string, string[]] => [
        tokenId,
        addresses.filter((address) => !isEthereumAddress(address)),
      ])
      // remove tokens which aren't subtensor staking tokens
      .filter(([tokenId]) => subtensorTokenIds.includes(tokenId)),
  )

  const uniqueChainIds = getUniqueChainIds(addressesBySubtensorToken, tokens)
  const chains = Object.fromEntries(
    Object.entries(allChains).filter(([chainId]) => uniqueChainIds.includes(chainId)),
  )

  const abortController = new AbortController()
  for (const [tokenId, addresses] of Object.entries(addressesBySubtensorToken)) {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      continue
    }
    if (token.type !== "substrate-native") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      continue
    }
    const chainId = token.networkId
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      continue
    }

    const miniMetadata = miniMetadatas.get(token.networkId)
    if (!miniMetadata?.data) {
      log.warn(`MiniMetadata for chain ${chainId} not found`)
      continue
    }

    const scaleApi = getScaleApi(
      {
        chainId,
        send: (...args) =>
          chainConnector.send(
            chainId,
            ...args,
            { expectErrors: true }, // don't pollute the wallet logs when this request fails
          ),
      },
      miniMetadata.data as `0x${string}`,
      token,
      chain.hasCheckMetadataHash,
      chain.signedExtensions,
      chain.registryTypes,
    )

    // sets the number of addresses to query in parallel (per chain, since each chain runs in parallel to the others)
    const concurrency = 4
    // In-memory cache for successful dynamic info results
    const dynamicInfoCache = new Map<number, GetDynamicInfoResult>()

    const fetchDynamicInfoForNetuids = async (
      uniqueNetuids: number[],
    ): Promise<(GetDynamicInfoResult | null | undefined)[]> => {
      const MAX_RETRIES = 3
      const RETRY_DELAY_MS = 500

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      const fetchInfo = async (
        netuid: number,
      ): Promise<GetDynamicInfoResult | null | undefined> => {
        if (netuid === 0) return null

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const params: GetDynamicInfoParams = [netuid]
            const result = await scaleApi.getRuntimeCallValue<GetDynamicInfoResult>(
              "SubnetInfoRuntimeApi",
              "get_dynamic_info",
              params,
            )

            dynamicInfoCache.set(netuid, result) // Cache successful response
            return result
          } catch (error) {
            log.trace(`Attempt ${attempt} failed for netuid ${netuid}:`, error)

            if (attempt < MAX_RETRIES) {
              const backoffTime = RETRY_DELAY_MS * 2 ** (attempt - 1)
              log.trace(`Retrying in ${backoffTime}ms...`)
              await delay(backoffTime)
            }
          }
        }

        if (dynamicInfoCache.has(netuid)) {
          return dynamicInfoCache.get(netuid) // Use cached value on failure
        }

        log.trace(
          `Failed to fetch dynamic info for netuid ${netuid} after ${MAX_RETRIES} attempts.`,
        )
        return null
      }

      return Promise.all(uniqueNetuids.map(fetchInfo))
    }

    const subtensorQueries = from(addresses).pipe(
      // mergeMap lets us run N concurrent queries, where N is the value of `concurrency`
      mergeMap(async (address) => {
        type QueryMethod = () => Promise<
          Array<{
            address: SS58String
            hotkey: SS58String
            stake: bigint
            netuid: number
            dynamicInfo: GetDynamicInfoResult | void | null
          }>
        >
        const queryMethods: Array<QueryMethod> = [
          async () => {
            if (chain.isTestnet) return []

            const params: GetStakeInfoForColdkeyParams = [address]
            const result = await scaleApi.getRuntimeCallValue<GetStakeInfoForColdkeyResult>(
              "StakeInfoRuntimeApi",
              "get_stake_info_for_coldkey",
              params,
            )
            if (!Array.isArray(result)) return []

            const uniqueNetuids = Array.from(
              new Set(
                result
                  .map((item) => Number(item.netuid))
                  .filter((netuid) => netuid !== SUBTENSOR_ROOT_NETUID),
              ),
            )

            await fetchDynamicInfoForNetuids(uniqueNetuids)

            const stakes = result
              ?.map(({ coldkey, hotkey, netuid, stake }) => {
                return {
                  address: coldkey,
                  hotkey,
                  netuid: Number(netuid),
                  stake: BigInt(stake),
                  dynamicInfo: dynamicInfoCache.get(Number(netuid)),
                }
              })
              .filter(({ stake }) => stake >= SUBTENSOR_MIN_STAKE_AMOUNT_PLANK)

            return stakes
          },
        ]

        const errors = []
        for (const queryMethod of queryMethods) {
          try {
            // try each query method
            return await queryMethod()
          } catch (cause) {
            // if it fails, keep track of the error and try the next one
            errors.push(cause)
          }
        }

        // if we get to here, that means that all query methods failed
        // let's throw the errors back to the native balance module
        throw new Error(
          [
            `Failed to fetch ${tokenId} subtensor staked balance for ${address}:`,
            ...errors.map((error) => String(error)),
          ].join("\n\t"),
        )
      }, concurrency),
      // instead of emitting each balance as it's fetched, toArray waits for them all to fetch and then it collects them into an array
      toArray(),
      // this mergeMap flattens our Array<Array<Stakes>> into just an Array<Stakes>
      mergeMap((stakes) => stakes),
      // convert our Array<Stakes> into Array<Balances>, which we can then return to the native balance module
      map((stakes) =>
        stakes.map(({ address, hotkey, stake, netuid, dynamicInfo }): SubNativeBalance => {
          const { token_symbol, subnet_name, subnet_identity } = dynamicInfo ?? {}
          const tokenSymbol = new TextDecoder().decode(Uint8Array.from(token_symbol ?? []))
          const subnetName = new TextDecoder().decode(Uint8Array.from(subnet_name ?? []))

          /** Map from Record<string, Binary> to Record<string, string> */
          const binaryToText = <T extends Record<string, Binary>>(
            input: T,
          ): { [K in keyof T]: string } =>
            Object.entries(input).reduce(
              (acc, [key, value]) => {
                acc[key as keyof T] = value.asText()
                return acc
              },
              {} as { [K in keyof T]: string },
            )
          const subnetIdentity = subnet_identity ? binaryToText(subnet_identity) : undefined

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

          return {
            source: "substrate-native",
            status: "live",
            address,
            networkId: chainId,
            tokenId,
            values: [
              {
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
              },
            ],
          }
        }),
      ),
    )

    // This observable will run the subtensorQueries on a 30s (30_000ms) interval.
    // However, if the last run has not yet completed (e.g. its been 30s but we're still fetching some balances),
    // then exhaustMap will wait until the next interval (so T: 60s, T: 90s, T: 120s, etc) before re-executing the subtensorQueries.
    const subtensorQueriesInterval = interval(30_000).pipe(
      startWith(0), // start immediately
      exhaustMap(() => {
        return subtensorQueries
      }),
    )

    // subscribe to the balances
    const subscription = subtensorQueriesInterval.subscribe({
      next: (balances) => callback(null, balances),
      error: (error) => callback(error),
    })

    // use the abortController to tear the subscription down when we don't need it anymore
    abortController.signal.onabort = () => subscription.unsubscribe()
  }
  return () => abortController.abort()
}
