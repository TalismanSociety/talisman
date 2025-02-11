import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"
import { SS58String } from "polkadot-api"
import { exhaustMap, from, interval, map, mergeMap, toArray } from "rxjs"

import type { SubNativeModule } from "./index"
import log from "../../log"
import { db as balancesDb } from "../../TalismanBalancesDatabase"
import { AddressesByToken, SubscriptionCallback } from "../../types"
import { findChainMeta, getUniqueChainIds } from "../util"
import { SubNativeBalance, SubNativeToken } from "./types"
import {
  DecodeResult_GetStakeInfoForColdkey,
  DecodeResult_old_GetStakeInfoForColdkey,
  EncodeParams_GetStakeInfoForColdkey,
  EncodeParams_old_GetStakeInfoForColdkey,
  SUBTENSOR_ROOT_NETUID,
} from "./util/subtensor"

export async function subscribeSubtensorStaking(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<SubNativeToken>,
  callback: SubscriptionCallback<SubNativeBalance[]>,
) {
  const allChains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()
  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ]),
  )
  const subtensorTokenIds = Object.entries(tokens)
    .filter(([, token]) => {
      // ignore non-native tokens
      if (token.type !== "substrate-native") return false
      // ignore tokens on chains with no subtensor pallet
      const [chainMeta] = findChainMeta<typeof SubNativeModule>(
        miniMetadatas,
        "substrate-native",
        allChains[token.chain.id],
      )
      return chainMeta?.hasSubtensorPallet === true
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
    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      continue
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      continue
    }

    // sets the number of addresses to query in parallel (per chain, since each chain runs in parallel to the others)
    const concurrency = 4
    const subtensorQueries = from(addresses).pipe(
      // mergeMap lets us run N concurrent queries, where N is the value of `concurrency`
      mergeMap(async (address) => {
        // We support two staked TAO methods,
        // the old subtensor staking, and the new dTAO subtensor staking.
        //
        // We first attempt to query via the old method, then using a try {} catch {} we detect
        // if it failed, and if so we try the new method.
        type QueryMethod = () => Promise<
          Array<
            | {
                address: SS58String
                hotkey: SS58String
                stake: bigint
              }
            | {
                address: SS58String
                hotkey: SS58String
                netuid: bigint
                stake: bigint
              }
          >
        >
        const queryMethods: Array<QueryMethod> = [
          // old method
          async () => {
            const method = "StakeInfoRuntimeApi_get_stake_info_for_coldkey"
            const params = EncodeParams_old_GetStakeInfoForColdkey(address)
            const response = await chainConnector.send(
              chainId,
              "state_call",
              [method, params],
              undefined,
              { expectErrors: true }, // don't pollute the wallet logs when this request fails
            )
            const result = DecodeResult_old_GetStakeInfoForColdkey(response)
            if (!Array.isArray(result)) return []

            const stakes = result
              ?.map(({ coldkey, hotkey, stake }) => ({
                address: coldkey,
                hotkey,
                stake: BigInt(stake),
              }))
              .filter(({ stake }) => stake !== 0n)

            return stakes
          },

          // new method
          async () => {
            const method = "StakeInfoRuntimeApi_get_stake_info_for_coldkey"
            const params = EncodeParams_GetStakeInfoForColdkey(address)
            const response = await chainConnector.send(
              chainId,
              "state_call",
              [method, params],
              undefined,
              { expectErrors: true }, // don't pollute the wallet logs when this request fails
            )
            const result = DecodeResult_GetStakeInfoForColdkey(response)
            if (!Array.isArray(result)) return []

            const stakes = result
              // Filter out subnet stakes for now
              .filter((stake) => stake.netuid === SUBTENSOR_ROOT_NETUID)
              ?.map(({ coldkey, hotkey, netuid, stake }) => ({
                address: coldkey,
                hotkey,
                netuid: BigInt(netuid),
                stake: BigInt(stake),
              }))
              .filter(({ stake }) => stake !== 0n)

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
        stakes.map(
          ({ address, hotkey, stake }): SubNativeBalance => ({
            source: "substrate-native",
            status: "live",
            address,
            multiChainId: { subChainId: chainId },
            chainId,
            tokenId,
            values: [
              {
                source: "subtensor-staking",
                type: "subtensor",
                label: "subtensor-staking",
                amount: stake.toString(),
                meta: {
                  type: "subtensor-staking",
                  hotkey,
                },
              },
            ],
          }),
        ),
      ),
    )

    // This observable will run the subtensorQueries on a 30s (30_000ms) interval.
    // However, if the last run has not yet completed (e.g. its been 30s but we're still fetching some balances),
    // then exhaustMap will wait until the next interval (so T: 60s, T: 90s, T: 120s, etc) before re-executing the subtensorQueries.
    const subtensorQueriesInterval = interval(30_000).pipe(exhaustMap(() => subtensorQueries))

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
