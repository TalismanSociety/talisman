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

import {
  chainsWithTestnetsMapState,
  evmNetworksWithTestnetsMapState,
  tokensWithTestnetsMapState,
} from "./chaindata"
import { tokenRatesMapState } from "./tokenRates"

const NO_OP = () => {}

const rawBalancesState = atom<BalanceJson[]>({
  key: "rawBalancesState",
  effects: [
    // sync from db
    ({ setSelf }) => {
      const key = "rawBalancesState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const obs = from(liveQuery(() => balancesDb.balances.toArray()))

      // backend will do a lot of updates to the balances table
      // debounce to mitigate performance issues
      // also, we only need the first value to hydrate the atom
      const sub = merge(obs.pipe(first()), obs.pipe(debounceTime(500))).subscribe((v) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(v)
      })

      return () => sub.unsubscribe()
    },
    // instruct backend to keep db syncrhonized while this atom is in use
    () => api.balances(NO_OP),
  ],
})

const filteredRawBalancesState = selector({
  key: "filteredRawBalancesState",
  get: ({ get }) => {
    const tokens = get(tokensWithTestnetsMapState)
    const balances = get(rawBalancesState)

    return balances.filter((b) => tokens[b.tokenId])
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const balancesHydrateState = selector<HydrateDb>({
  key: "balancesHydrateState",
  get: ({ get }) => {
    const chains = get(chainsWithTestnetsMapState)
    const evmNetworks = get(evmNetworksWithTestnetsMapState)
    const tokens = get(tokensWithTestnetsMapState)
    const tokenRates = get(tokenRatesMapState)

    return { chains, evmNetworks, tokens, tokenRates }
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const allBalancesState = selector({
  key: "allBalancesState",
  get: ({ get }) => {
    const rawBalances = get(filteredRawBalancesState)
    const hydrate = get(balancesHydrateState)

    return new Balances(deriveStatuses([...getValidSubscriptionIds()], rawBalances), hydrate)
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

const rawBalancesQuery = selectorFamily({
  key: "rawBalancesByAddressQuery",
  get:
    ({ address, tokenId }: { address?: Address; tokenId?: TokenId }) =>
    ({ get }) => {
      const balances = get(filteredRawBalancesState)
      return balances.filter(
        (b) => (!address || b.address === address) && (!tokenId || b.tokenId === tokenId)
      )
    },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const balancesQuery = selectorFamily({
  key: "balancesQuery",
  get:
    ({ address, tokenId }: { address?: Address; tokenId?: TokenId }) =>
    ({ get }) => {
      const rawBalances = get(rawBalancesQuery({ address, tokenId }))
      const hydrate = get(balancesHydrateState)
      return new Balances(deriveStatuses([...getValidSubscriptionIds()], rawBalances), hydrate)
    },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})
