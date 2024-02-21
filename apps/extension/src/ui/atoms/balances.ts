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

// const rawBalancesState = ratom<BalanceJson[]>({
//   key: "rawBalancesState",
//   effects: [
//     // sync from db
//     ({ setSelf }) => {
//       log.debug("rawBalancesState.init")

//       // backend will do a lot of updates to the balances table
//       // debounce to mitigate performance issues
//       const sub = from(liveQuery(() => balancesDb.balances.toArray()))
//         .pipe(firstThenDebounce(500))
//         .subscribe(setSelf)

//       return () => sub.unsubscribe()
//     },
//     // instruct backend to keep db synchronized while this atom is in use
//     () => api.balances(NO_OP),
//   ],
//   /**
//    * Given the following constraints:
//    * 1. We store rawBalances in recoil
//    * 2. We only access rawBalances from one place (the `allBalancesState` selector)
//    *
//    * And the context:
//    * 1. We set the `status` field of every balance inside of the `allBalancesState` selector
//    * 2. Making a full copy of every balance inside of the `allBalancesState` selector, just so we can set the `status` field, is a SLOW process
//    *
//    * Then the following conclusion is true:
//    * 1. It's quicker that we just mutate the existing `rawBalances` inside of this atom, and due to constraint (2) we avoid any of
//    *    the downsides which recoil's `dangerouslyAllowMutability: false` flag is designed to prevent.
//    */
//   dangerouslyAllowMutability: true,
// })

const filteredRawBalancesAtom = atom(async (get) => {
  const [tokens, balances] = await Promise.all([
    get(activeTokensWithTestnetsMapAtom),
    get(rawBalancesAtom),
  ])

  return balances.filter((b) => tokens[b.tokenId])
})

// const filteredRawBalancesState = selector({
//   key: "filteredRawBalancesState",
//   get: ({ get }) => {
//     const [tokens, balances] = get(waitForAll([activeTokensWithTestnetsMapState, rawBalancesState]))

//     return balances.filter((b) => tokens[b.tokenId])
//   },
//   /**
//    * The reason we need this is described in the rawBalancesState atom, where it is also set to true
//    */
//   dangerouslyAllowMutability: true,
// })

export const balancesHydrateAtom = atom(async (get) => {
  const [chains, evmNetworks, tokens, tokenRates] = await Promise.all([
    get(activeChainsWithTestnetsMapAtom),
    get(activeEvmNetworksWithTestnetsMapAtom),
    get(activeTokensWithTestnetsMapAtom),
    get(tokenRatesMapAtom),
  ])
  return { chains, evmNetworks, tokens, tokenRates } as HydrateDb
})

// export const balancesHydrateState = selector<HydrateDb>({
//   key: "balancesHydrateState",
//   get: ({ get }) => {
//     const [chains, evmNetworks, tokens, tokenRates] = get(
//       waitForAll([
//         activeChainsWithTestnetsMapState,
//         activeEvmNetworksWithTestnetsMapState,
//         activeTokensWithTestnetsMapState,
//         tokenRatesMapState,
//       ])
//     )

//     return { chains, evmNetworks, tokens, tokenRates }
//   },
// })

export const allBalancesAtom = atom(async (get) => {
  const [rawBalances, hydrate] = await Promise.all([
    get(filteredRawBalancesAtom),
    get(balancesHydrateAtom),
  ])
  return new Balances(deriveStatuses(getValidSubscriptionIds(), rawBalances), hydrate)
})

// const allBalancesState = selector({
//   key: "allBalancesState",
//   get: ({ get }) => {
//     const [rawBalances, hydrate] = get(waitForAll([filteredRawBalancesState, balancesHydrateState]))

//     return new Balances(deriveStatuses(getValidSubscriptionIds(), rawBalances), hydrate)
//   },
// })

type BalanceQueryParams = { address?: Address; tokenId?: TokenId }

export const balancesAtomFamily = atomFamily(({ address, tokenId }: BalanceQueryParams) =>
  atom(async (get) => {
    const allBalances = await get(allBalancesAtom)
    const filteredBalances = allBalances.each.filter(
      (b) => (!address || b.address === address) && (!tokenId || b.tokenId === tokenId)
    )

    return new Balances(filteredBalances)
  })
)

// export const balancesQuery = selectorFamily({
//   key: "balancesQuery",
//   get:
//     ({ address, tokenId }: { address?: Address; tokenId?: TokenId }) =>
//     ({ get }) => {
//       const allBalances = get(allBalancesState)
//       const filteredBalances = allBalances.each.filter(
//         (b) => (!address || b.address === address) && (!tokenId || b.tokenId === tokenId)
//       )

//       return new Balances(filteredBalances)
//     },
// })

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

// export const balancesFilterQuery = selectorFamily({
//   key: "balancesFilterQuery",
//   get:
//     (accountsFilter: AccountCategory) =>
//     ({ get }) => {
//       const [allBalances, accounts] = get(
//         waitForAll([allBalancesState, accountsQuery(accountsFilter)])
//       )

//       return new Balances(
//         allBalances.each.filter((b) => accounts.some((a) => a.address === b.address))
//       )
//     },
// })
