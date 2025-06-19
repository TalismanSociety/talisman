import { u8aToHex } from "@polkadot/util"
import { ChainConnector } from "@talismn/chain-connector"
import {
  ChaindataProvider,
  CustomSubNativeToken,
  parseTokenId,
  SubNativeToken,
} from "@talismn/chaindata-provider"
import { decodeScale, encodeStateKey } from "@talismn/scale"
import { decodeAnyAddress, isEthereumAddress } from "@talismn/util"
import { keys } from "lodash"
import isEqual from "lodash/isEqual"
import { map, scan, share, switchAll } from "rxjs"
import { u128 } from "scale-ts"

import { getMiniMetadata } from "../../getMiniMetadata"
import log from "../../log"
import { AddressesByToken, MiniMetadata, SubscriptionCallback } from "../../types"
import { buildStorageCoders, getUniqueChainIds, RpcStateQuery, RpcStateQueryHelper } from "../util"
import { SubNativeBalance } from "./types"
import { asObservable } from "./util/asObservable"
import { crowdloanFundContributionsChildKey } from "./util/crowdloanFundContributionsChildKey"

// TODO make this method chain-specific
export async function subscribeCrowdloans(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<SubNativeToken | CustomSubNativeToken>,
  callback: SubscriptionCallback<SubNativeBalance[]>,
  signal?: AbortSignal,
) {
  const allChains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()

  // there should be only one network here when subscribing to balances, we've split it up by network at the top level
  const networkIds = keys(addressesByToken).map((tokenId) => parseTokenId(tokenId).networkId)

  const miniMetadatas = new Map<string, MiniMetadata>()
  for (const networkId of networkIds)
    miniMetadatas.set(
      networkId,
      await getMiniMetadata(chaindataProvider, chainConnector, networkId, "substrate-native"),
    )

  signal?.throwIfAborted()

  const crowdloanTokenIds = Object.entries(tokens)
    .filter(([, token]) => {
      // ignore non-native tokens
      if (token.type !== "substrate-native") return
      // ignore tokens on chains with no crowdloans pallet
      const miniMetadata = miniMetadatas.get(token.networkId)
      return typeof miniMetadata?.extra?.crowdloanPalletId === "string"
    })
    .map(([tokenId]) => tokenId)

  // crowdloan contributions can only be done by the native token on chains with the crowdloan pallet
  const addressesByCrowdloanToken = Object.fromEntries(
    Object.entries(addressesByToken)
      // remove ethereum addresses
      .map(([tokenId, addresses]): [string, string[]] => [
        tokenId,
        addresses.filter((address) => !isEthereumAddress(address)),
      ])
      // remove tokens which aren't crowdloan tokens
      .filter(([tokenId]) => crowdloanTokenIds.includes(tokenId)),
  )

  const uniqueChainIds = getUniqueChainIds(addressesByCrowdloanToken, tokens)
  const chains = Object.fromEntries(
    Object.entries(allChains).filter(([chainId]) => uniqueChainIds.includes(chainId)),
  )
  const chainStorageCoders = buildStorageCoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    coders: {
      parachains: ["Paras", "Parachains"],
      funds: ["Crowdloan", "Funds"],
    },
  })

  const tokenSubscriptions: Array<() => void> = []
  for (const [tokenId, addresses] of Object.entries(addressesByCrowdloanToken)) {
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
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      continue
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      continue
    }

    const subscribeParaIds = (callback: SubscriptionCallback<Array<number[]>>) => {
      const scaleCoder = chainStorageCoders.get(chainId)?.parachains
      const queries = [0].flatMap((): RpcStateQuery<number[]> | [] => {
        const stateKey = encodeStateKey(scaleCoder)
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = number[]
          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode parachains on chain ${chainId}`,
          )

          const paraIds = decoded ?? []

          return paraIds
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type ParaFundIndex = {
      paraId: number
      fundPeriod: string
      fundIndex?: number
    }
    const subscribeParaFundIndexes = (
      paraIds: number[],
      callback: SubscriptionCallback<ParaFundIndex[]>,
    ) => {
      const scaleCoder = chainStorageCoders.get(chainId)?.funds
      const queries = paraIds.flatMap((paraId): RpcStateQuery<ParaFundIndex> | [] => {
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid paraId in ${chainId} funds query ${paraId}`,
          paraId,
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            cap?: bigint
            deposit?: bigint
            depositor?: string
            end?: number
            fund_index?: number
            trie_index?: number
            first_period?: number
            last_period?: number
            last_contribution?: unknown
            raised?: bigint
            verifier?: unknown
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode paras on chain ${chainId}`,
          )

          const firstPeriod = decoded?.first_period?.toString?.() ?? ""
          const lastPeriod = decoded?.last_period?.toString?.() ?? ""
          const fundPeriod = `${firstPeriod}-${lastPeriod}`
          const fundIndex = decoded?.fund_index ?? decoded?.trie_index

          return { paraId, fundPeriod, fundIndex }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type FundContribution = {
      paraId: number
      fundIndex: number
      address: string
      amount: string
    }
    const subscribeFundContributions = (
      funds: Array<{ paraId: number; fundIndex: number }>,
      addresses: string[],
      callback: SubscriptionCallback<FundContribution[]>,
    ) => {
      // TODO: Watch system_events in order to subscribe to changes, then redo the contributions query when changes are detected:
      // https://github.com/polkadot-js/api/blob/8fe02a14345b57e6abb8f7f2c2b624cf70c51b23/packages/api-derive/src/crowdloan/ownContributions.ts#L32-L47
      //
      // For now we just re-fetch all contributions on a timer and then only send them to the subscription callback when they have changed

      const queries = funds.map(({ paraId, fundIndex }) => ({
        paraId,
        fundIndex,
        addresses,
        childKey: crowdloanFundContributionsChildKey(fundIndex),
        storageKeys: addresses.map((address) => u8aToHex(decodeAnyAddress(address))),
      }))

      // track whether our caller is still subscribed
      let subscriptionActive = true
      let previousContributions: FundContribution[] | null = null

      const fetchContributions = async () => {
        try {
          const results = await Promise.all(
            queries.map(async ({ paraId, fundIndex, addresses, childKey, storageKeys }) => ({
              paraId,
              fundIndex,
              addresses,
              result: await chainConnector.send<Array<string | null> | undefined>(
                chainId,
                "childstate_getStorageEntries",
                [childKey, storageKeys],
              ),
            })),
          )

          const contributions = results.flatMap((queryResult) => {
            const { paraId, fundIndex, addresses, result } = queryResult

            return (Array.isArray(result) ? result : []).flatMap((encoded, index) => {
              const amount = (() => {
                try {
                  return typeof encoded === "string" ? (u128.dec(encoded) ?? 0n) : 0n
                } catch {
                  return 0n
                }
              })().toString()

              return {
                paraId,
                fundIndex,
                address: addresses[index],
                amount,
              }
            })
          })

          // ignore these results if our caller has tried to close this subscription
          if (!subscriptionActive) return

          // ignore these results if they're the same as what we previously fetched
          if (isEqual(previousContributions, contributions)) return

          previousContributions = contributions
          callback(null, contributions)
        } catch (error) {
          callback(error)
        }
      }

      // set up polling for contributions
      const crowdloanContributionsPollInterval = 60_000 // 60_000ms === 1 minute
      const pollContributions = async () => {
        if (!subscriptionActive) return

        try {
          await fetchContributions()
        } catch (error) {
          // log any errors, but don't cancel the poll for contributions when one fetch fails
          log.error(error)
        }

        if (!subscriptionActive) return
        setTimeout(pollContributions, crowdloanContributionsPollInterval)
      }

      // start polling
      pollContributions()

      return () => {
        // stop polling
        subscriptionActive = false
      }
    }

    const paraIds$ = asObservable(subscribeParaIds)().pipe(
      scan((_, next) => Array.from(new Set(next.flatMap((paraIds) => paraIds))), [] as number[]),
      share(),
    )

    const fundIndexesByParaId$ = paraIds$.pipe(
      map((paraIds) => asObservable(subscribeParaFundIndexes)(paraIds)),
      switchAll(),
      scan((state, next) => {
        for (const fund of next) {
          const { paraId, fundIndex } = fund
          if (typeof fundIndex === "number") {
            state.set(paraId, (state.get(paraId) ?? new Set()).add(fundIndex))
          }
        }
        return state
      }, new Map<number, Set<number>>()),
    )

    const contributionsByAddress$ = fundIndexesByParaId$.pipe(
      map((fundIndexesByParaId) =>
        Array.from(fundIndexesByParaId).flatMap(([paraId, fundIndexes]) =>
          Array.from(fundIndexes).map((fundIndex) => ({ paraId, fundIndex })),
        ),
      ),
      map((funds) => asObservable(subscribeFundContributions)(funds, addresses)),
      switchAll(),
      scan((state, next) => {
        for (const contribution of next) {
          const { address } = contribution
          state.set(address, (state.get(address) ?? new Set()).add(contribution))
        }
        return state
      }, new Map<string, Set<FundContribution>>()),
    )

    const subscription = contributionsByAddress$.subscribe({
      next: (contributionsByAddress) => {
        const balances: SubNativeBalance[] = Array.from(contributionsByAddress).map(
          ([address, contributions]) => {
            return {
              source: "substrate-native",
              status: "live",
              address,
              networkId: chainId,
              tokenId,
              values: Array.from(contributions).map(({ amount, paraId }) => ({
                type: "crowdloan",
                label: "crowdloan",
                source: "crowdloan",
                amount: amount,
                meta: { paraId },
              })),
            }
          },
        )
        if (balances.length > 0) callback(null, balances)
      },
      error: (error) => callback(error),
    })

    tokenSubscriptions.push(() => subscription.unsubscribe())
  }

  return () => tokenSubscriptions.forEach((unsub) => unsub())
}
