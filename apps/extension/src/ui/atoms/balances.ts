import { Address, Balances, HydrateDb } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { atom } from "jotai"
import { atomFamily } from "jotai/utils"
import isEqual from "lodash/isEqual"

import { BalanceSubscriptionResponse, isAccountCompatibleWithChain } from "@extension/core"
import { api } from "@ui/api"

import { AccountCategory, accountsByCategoryAtomFamily, accountsMapAtom } from "./accounts"
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
  api.balances,
  { debugLabel: "rawBalancesSubscriptionAtom", refCount: true }
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
  const [tokens, chains, accounts, balances] = await Promise.all([
    get(activeTokensWithTestnetsMapAtom),
    get(activeChainsWithTestnetsMapAtom),
    get(accountsMapAtom),
    get(rawBalancesAtom),
  ])

  // exclude invalid balances
  return balances.filter((b) => {
    // ensure there is a matching token
    if (!tokens[b.tokenId]) return false

    const account = accounts[b.address]
    if (!account || !account.type) return false

    // for chain specific accounts, exclude balances from other chains
    if ("chainId" in b && b.chainId && chains?.[b.chainId])
      return isAccountCompatibleWithChain(chains[b.chainId], account.type, account.genesisHash)
    if ("evmNetworkId" in b && b.evmNetworkId) return account.type === "ethereum"
    return false
  })
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
    const accountIds = accounts.map((a) => a.address)
    return new Balances(allBalances.each.filter((b) => accountIds.includes(b.address)))
  })
)
