import { Address, Balances, HydrateDb } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { selector, selectorFamily } from "recoil"

import { dbCacheState } from "./dbCache"

/**
 * Necessary subscriptions to keep data updated :
 * useDbCacheSubscription("balances")
 */
const rawBalancesState = selector({
  key: "rawBalancesState",
  get: ({ get }) => {
    const { balances } = get(dbCacheState)

    return balances
  },
})

/**
 * Necessary subscriptions to keep data updated :
 * useDbCacheSubscription("chains")
 * useDbCacheSubscription("evmNetworks")
 * useDbCacheSubscription("tokens")
 * useDbCacheSubscription("tokenRates")
 */
export const balancesHydrateState = selector<HydrateDb>({
  key: "balancesHydrateState",
  get: ({ get }) => {
    const {
      chainsWithTestnetsMap: chains,
      evmNetworksWithTestnetsMap: evmNetworks,
      tokensWithTestnetsMap: tokens,
      tokenRatesMap: tokenRates,
    } = get(dbCacheState)

    return { chains, evmNetworks, tokens, tokenRates }
  },
})

/**
 * Necessary subscriptions to keep data updated :
 * useDbCacheSubscription("balances")
 * useDbCacheSubscription("chains")
 * useDbCacheSubscription("evmNetworks")
 * useDbCacheSubscription("tokens")
 * useDbCacheSubscription("tokenRates")
 */
export const allBalancesState = selector({
  key: "allBalancesState",
  get: ({ get }) => {
    const rawBalances = get(rawBalancesState)
    const hydrate = get(balancesHydrateState)

    return new Balances(rawBalances, hydrate)
  },
})

const rawBalancesQuery = selectorFamily({
  key: "rawBalancesByAddressQuery",
  get:
    ({ address, tokenId }: { address?: Address; tokenId?: TokenId }) =>
    ({ get }) => {
      const balances = get(rawBalancesState)
      return balances.filter(
        (b) => (!address || b.address === address) && (!tokenId || b.tokenId === tokenId)
      )
    },
})

/**
 * Necessary subscriptions to keep data updated :
 * useDbCacheSubscription("balances")
 * useDbCacheSubscription("chains")
 * useDbCacheSubscription("evmNetworks")
 * useDbCacheSubscription("tokens")
 * useDbCacheSubscription("tokenRates")
 */
export const balancesQuery = selectorFamily({
  key: "balancesQuery",
  get:
    ({ address, tokenId }: { address?: Address; tokenId?: TokenId }) =>
    ({ get }) => {
      const rawBalances = get(rawBalancesQuery({ address, tokenId }))
      const hydrate = get(balancesHydrateState)
      return new Balances(rawBalances, hydrate)
    },
})
