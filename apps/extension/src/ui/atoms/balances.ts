import { BalanceSubscriptionResponse } from "@extension/core"
import { Address, Balances, HydrateDb } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { atom } from "jotai"
import { atomFamily } from "jotai/utils"
import isEqual from "lodash/isEqual"

import { AccountCategory, accountsByCategoryAtomFamily } from "./accounts"
import {
  activeChainsWithTestnetsMapAtom,
  activeEvmNetworksWithTestnetsMapAtom,
  activeTokensWithTestnetsMapAtom,
} from "./chaindata"
import { tokenRatesMapAtom } from "./tokenRates"
import { atomWithSubscription } from "./utils/atomWithSubscription"

// Reading this atom triggers the balances backend subscription
// Note : unsubscribing has no effect, the backend subscription will keep polling until the port (window or tab) is closed
const rawBalancesSubscriptionAtom = atomWithSubscription<BalanceSubscriptionResponse>(
  (get) => api.balances(get),
  "rawBalancesSubscriptionAtom"
)

export const balancesInitialisingAtom = atom(async (get) => {
  const balances = await get(rawBalancesSubscriptionAtom)
  return balances.status === "initialising"
})

const rawBalancesAtom = atom(async (get) => {
  const balances = await get(rawBalancesSubscriptionAtom)
  return balances.data
})

const filteredRawBalancesAtom = atom(async (get) => {
  const [tokens, balances] = await Promise.all([
    get(activeTokensWithTestnetsMapAtom),
    get(rawBalancesAtom),
  ])

  return balances.filter((b) => tokens[b.tokenId])
})

export const balancesHydrateAtom = atom(async (get) => {
  const [chains, evmNetworks, tokens, tokenRates] = await Promise.all([
    get(activeChainsWithTestnetsMapAtom),
    get(activeEvmNetworksWithTestnetsMapAtom),
    get(activeTokensWithTestnetsMapAtom),
    get(tokenRatesMapAtom),
  ])
  return { chains, evmNetworks, tokens, tokenRates } as HydrateDb
})

const allBalancesAtom = atom(async (get) => {
  const [rawBalances, hydrate] = await Promise.all([
    get(filteredRawBalancesAtom),
    get(balancesHydrateAtom),
  ])
  return new Balances(rawBalances, hydrate)
})

type BalanceQueryParams = { address?: Address; tokenId?: TokenId }

export const balancesAtomFamily = atomFamily(
  ({ address, tokenId }: BalanceQueryParams) =>
    atom(async (get) => {
      const allBalances = await get(allBalancesAtom)
      const filteredBalances = allBalances.each.filter(
        (b) => (!address || b.address === address) && (!tokenId || b.tokenId === tokenId)
      )

      return new Balances(filteredBalances)
    }),
  isEqual
)

export const balancesByAccountCategoryAtomFamily = atomFamily((accountCategory: AccountCategory) =>
  atom(async (get) => {
    const [allBalances, accounts] = await Promise.all([
      get(allBalancesAtom),
      get(accountsByCategoryAtomFamily(accountCategory)),
    ])
    return new Balances(
      allBalances.each.filter((b) => accounts.some((a) => a.address === b.address))
    )
  })
)
