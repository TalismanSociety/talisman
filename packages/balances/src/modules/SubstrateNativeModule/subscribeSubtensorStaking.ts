import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider } from "@talismn/chaindata-provider"
import { decodeScale, encodeStateKey } from "@talismn/scale"
import { isEthereumAddress } from "@talismn/util"
import { combineLatest, scan, share } from "rxjs"

import type { SubNativeModule } from "./index"
import log from "../../log"
import { db as balancesDb } from "../../TalismanBalancesDatabase"
import { AddressesByToken, SubscriptionCallback } from "../../types"
import {
  buildStorageCoders,
  findChainMeta,
  getUniqueChainIds,
  RpcStateQuery,
  RpcStateQueryHelper,
} from "../util"
import { SubNativeBalance, SubNativeToken } from "./types"
import { asObservable } from "./util/asObservable"

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
  const chainStorageCoders = buildStorageCoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-native",
    coders: {
      totalColdkeyStake: ["SubtensorModule", "TotalColdkeyStake"],
    },
  })

  const resultUnsubscribes: Array<() => void> = []
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

    type TotalColdkeyStake = {
      tokenId: string
      address: string
      stake?: bigint
    }
    const subscribeTotalColdkeyStake = (
      addresses: string[],
      callback: SubscriptionCallback<TotalColdkeyStake[]>,
    ) => {
      const scaleCoder = chainStorageCoders.get(chainId)?.totalColdkeyStake
      const queries = addresses.flatMap((address): RpcStateQuery<TotalColdkeyStake> | [] => {
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} totalColdkeyStake query ${address}`,
          address,
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = bigint

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode totalColdkeyStake on chain ${chainId}`,
          )

          const stake: bigint | undefined = decoded ?? undefined

          return { tokenId, address, stake }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    const totalColdkeyStakeByAddress$ = asObservable(subscribeTotalColdkeyStake)(addresses).pipe(
      scan((state, next) => {
        for (const totalColdkeyStake of next) {
          const { address, stake } = totalColdkeyStake
          if (typeof stake === "bigint") state.set(address, stake)
          else state.delete(totalColdkeyStake.address)
        }
        return state
      }, new Map<string, bigint>()),
      share(),
    )

    const subscription = combineLatest([totalColdkeyStakeByAddress$]).subscribe({
      next: ([totalColdkeyStakeByAddress]) => {
        const balances = Array.from(totalColdkeyStakeByAddress)
          .map(([address, stake]) => {
            return {
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
                },
              ],
            } as SubNativeBalance
          })
          .filter(Boolean) as SubNativeBalance[]

        if (balances.length > 0) callback(null, balances)
      },
      error: (error) => callback(error),
    })

    resultUnsubscribes.push(() => subscription.unsubscribe())
  }
  return () => resultUnsubscribes.forEach((unsub) => unsub())
}
