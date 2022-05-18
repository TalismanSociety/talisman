import { api } from "@ui/api"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import { useChains } from "@ui/hooks/useChains"
import { useTokens } from "@ui/hooks/useTokens"
import { BehaviorSubject } from "rxjs"
import { useCallback, useEffect } from "react"
import { ChainList, ChainId, Balances, TokenList, TokenId } from "@core/types"
import { ReplaySubject, firstValueFrom } from "rxjs"

const INITIAL_VALUE = new Balances({})
const sharedChainsCache = new ReplaySubject<ChainList>(1)
const sharedTokensCache = new ReplaySubject<TokenList>(1)

// TODO: Design a more elegant solution for balances hydration.
// What follows is a solution that works, but is a bit of a workaround.
//
// Scenario:
//   - We don't want to send a copy of every chain along with every balance a la:
//     { id: 'balanceid', chain: { ...allChainFields }, free: '10', reserved: '10' }
//   - The balance object needs to know about its chain in order to be formatted as anything other than planck.
//   - We retrieve balances and chains separately from the backend and then 'hydrate' the balances with the chains.
//   - We expect methods like `balance.total.tokens` to work without needing to wait on some data (the chains) to load.
//
// Current design:
//   - Fetch all chains early on and store them in a cache.
//   - Hydrate incoming balances with chaindata from the cache. Don't put them anywhere useful until after hydration is complete.
//   - Add hydrated balances to the BehaviorSubject which is passed to whoever calls useBalances.
//
// Pros:
//   - Relatively simple.
//   - Quick and easy to implement.
//   - Only hydrated balances are shown in the UI == less loading cases to deal with when building the UI components.
//
// Cons:
//   - Requires caching all chains inside the balances hook.
//   - Balances are completely unavailable until chains cache is built. Even for code which doesn't rely on chaindata (e.g. how many chains does the user have non-zero balances on).
//   - Requires implementing the (Balances + BalancesUpdate => Balances) logic inside this hook instead of inside `@core/util/balances.ts` where it probably belongs.
//   - If some chaindata is updated (let's say the tokenDecimals for polkadot changes from 18 to 10), existing balances shown in the UI won't be updated to show this.
//
// Ideas for a future design:
//   - Maybe instead of hydrating the balances with their chains, we provide them non-async access to the chaindata already available on the frontend.
//   - When either a balance updates OR a chain updates or more data becomes available, all users of the non-async data which is available are told to re-render.
//   - This would allow sync access to e.g. the `balance.total.tokens` method once the data is available, but also allow this method to return null when the data
//     is not yet available. Once the data is available react can be responsible for updating the UI which is using the method.
//   - UI or other hooks which require this data to be available could return early if `balance.total.tokens === null` and wait for a future re-render before proceeding.
//
export function useSharedChainsCache() {
  const chains = useChains()
  useEffect(() => {
    // always store the latest chains update in the cache.
    // existing balances won't be told about new data, but at least new balances won't use old data!
    if (chains && Object.keys(chains).length > 0) sharedChainsCache.next(chains)
  }, [chains])

  const getChain = useCallback(
    async (chainId: ChainId) => (await firstValueFrom(sharedChainsCache))[chainId],
    []
  )

  return getChain
}

export function useSharedTokensCache() {
  const tokens = useTokens()
  useEffect(() => {
    // always store the latest tokens update in the cache.
    // existing balances won't be told about new data, but at least new balances won't use old data!
    if (tokens && Object.keys(tokens).length > 0) sharedTokensCache.next(tokens)
  }, [tokens])

  const getToken = useCallback(
    async (tokenId: TokenId) => (await firstValueFrom(sharedTokensCache))[tokenId],
    []
  )

  return getToken
}

export const useBalances = () => {
  const getChain = useSharedChainsCache()
  const getToken = useSharedTokensCache()

  const subscribe = useCallback(
    (subject: BehaviorSubject<Balances>) =>
      api.subscribeBalances(async (update) => {
        switch (update.type) {
          case "reset": {
            const newBalances = new Balances(update.balances)
            await newBalances.hydrate({ chain: getChain, token: getToken })
            return subject.next(newBalances)
          }

          case "upsert": {
            const newBalances = new Balances(update.balances)
            await newBalances.hydrate({ chain: getChain, token: getToken })
            return subject.next(subject.value.add(newBalances))
          }

          case "delete": {
            return subject.next(subject.value.remove(update.balances))
          }

          default:
            const exhaustiveCheck: never = update
            throw new Error(`Unhandled BalancesUpdate type: ${exhaustiveCheck}`)
        }
      }),
    [getChain, getToken]
  )

  return useMessageSubscription("subscribeBalances", INITIAL_VALUE, subscribe)
}
export default useBalances
