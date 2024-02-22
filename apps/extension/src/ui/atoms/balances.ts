import { firstThenDebounce } from "@core/util/firstThenDebounce"
import {
  Address,
  Balances,
  HydrateDb,
  db as balancesDb,
  deriveStatuses,
  getValidSubscriptionIds,
} from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomFamily, atomWithObservable } from "jotai/utils"
import isEqual from "lodash/isEqual"
import { from } from "rxjs"

import { AccountCategory, accountsByCategoryAtomFamily } from "./accounts"
import {
  activeChainsWithTestnetsMapAtom,
  activeEvmNetworksWithTestnetsMapAtom,
  activeTokensWithTestnetsMapAtom,
} from "./chaindata"
import { tokenRatesMapAtom } from "./tokenRates"
import { atomWithSubscription } from "./utils/atomWithSubscription"

const NO_OP = () => {}

const rawBalancesSubscriptionAtom = atomWithSubscription<void>(
  () => api.balances(NO_OP),
  "rawBalancesSubscriptionAtom"
)
const rawBalancesObservableAtom = atomWithObservable(() =>
  from(liveQuery(() => balancesDb.balances.toArray())).pipe(firstThenDebounce(500))
)

const rawBalancesAtom = atom((get) => {
  get(rawBalancesSubscriptionAtom)
  return get(rawBalancesObservableAtom)
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

export const allBalancesAtom = atom(async (get) => {
  const [rawBalances, hydrate] = await Promise.all([
    get(filteredRawBalancesAtom),
    get(balancesHydrateAtom),
  ])
  return new Balances(deriveStatuses(getValidSubscriptionIds(), rawBalances), hydrate)
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
