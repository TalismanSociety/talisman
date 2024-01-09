import {
  Address,
  BalanceJson,
  Balances,
  HydrateDb,
  db as balancesDb,
  deriveStatuses,
  getValidSubscriptionIds,
} from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { liveQuery } from "dexie"
import { atom, selector, selectorFamily } from "recoil"
import { debounceTime, first, from, merge } from "rxjs"

import { AccountsFilter, accountsQuery } from "./accounts"
import {
  activeChainsWithTestnetsMapState,
  activeEvmNetworksWithTestnetsMapState,
  activeTokensWithTestnetsMapState,
} from "./chaindata"
import { tokenRatesMapState } from "./tokenRates"

const NO_OP = () => {}

const rawBalancesState = atom<BalanceJson[]>({
  key: "rawBalancesState",
  //default: [],
  effects: [
    // sync from db
    ({ setSelf }) => {
      const obs = from(liveQuery(() => balancesDb.balances.toArray()))

      // backend will do a lot of updates to the balances table
      // debounce to mitigate performance issues
      // also, we only need the first value to hydrate the atom
      const sub = merge(obs.pipe(first()), obs.pipe(debounceTime(500))).subscribe(setSelf)

      return () => sub.unsubscribe()
    },
    // instruct backend to keep db synchronized while this atom is in use
    () => api.balances(NO_OP),
  ],
  /**
   * Given the following constraints:
   * 1. We store rawBalances in recoil
   * 2. We only access rawBalances from one place (the `allBalancesState` selector)
   *
   * And the context:
   * 1. We set the `status` field of every balance inside of the `allBalancesState` selector
   * 2. Making a full copy of every balance inside of the `allBalancesState` selector, just so we can set the `status` field, is a SLOW process
   *
   * Then the following conclusion is true:
   * 1. It's quicker that we just mutate the existing `rawBalances` inside of this atom, and due to constraint (2) we avoid any of
   *    the downsides which recoil's `dangerouslyAllowMutability: false` flag is designed to prevent.
   */
  dangerouslyAllowMutability: true,
})

const filteredRawBalancesState = selector({
  key: "filteredRawBalancesState",
  get: ({ get }) => {
    const tokens = get(activeTokensWithTestnetsMapState)
    const balances = get(rawBalancesState)

    return balances.filter((b) => tokens[b.tokenId])
  },
  /**
   * The reason we need this is described in the rawBalancesState atom, where it is also set to true
   */
  dangerouslyAllowMutability: true,
})

export const balancesHydrateState = selector<HydrateDb>({
  key: "balancesHydrateState",
  get: ({ get }) => {
    const chains = get(activeChainsWithTestnetsMapState)
    const evmNetworks = get(activeEvmNetworksWithTestnetsMapState)
    const tokens = get(activeTokensWithTestnetsMapState)
    const tokenRates = get(tokenRatesMapState)

    return { chains, evmNetworks, tokens, tokenRates }
  },
})

const allBalancesState = selector({
  key: "allBalancesState",
  get: ({ get }) => {
    const rawBalances = get(filteredRawBalancesState)
    const hydrate = get(balancesHydrateState)

    return new Balances(deriveStatuses(getValidSubscriptionIds(), rawBalances), hydrate)
  },
})

export const balancesQuery = selectorFamily({
  key: "balancesQuery",
  get:
    ({ address, tokenId }: { address?: Address; tokenId?: TokenId }) =>
    ({ get }) => {
      const allBalances = get(allBalancesState)
      const filteredBalances = allBalances.each.filter(
        (b) => (!address || b.address === address) && (!tokenId || b.tokenId === tokenId)
      )

      return new Balances(filteredBalances)
    },
})

export const balancesFilterQuery = selectorFamily({
  key: "balancesFilterQuery",
  get:
    (accountsFilter: AccountsFilter) =>
    ({ get }) => {
      const allBalances = get(allBalancesState)
      const accounts = get(accountsQuery(accountsFilter))

      return new Balances(
        allBalances.each.filter((b) => accounts.some((a) => a.address === b.address))
      )
    },
})
