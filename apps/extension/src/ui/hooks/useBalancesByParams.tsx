import { api } from "@ui/api"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import { BehaviorSubject } from "rxjs"
import { useCallback, useMemo, useState } from "react"
import { Balances, AddressesByChain } from "@core/types"
import { useSharedChainsCache, useSharedTokensCache } from "@ui/hooks/useBalances"
import md5 from "blueimp-md5"
import { useDebounce } from "react-use"

const INITIAL_VALUE = new Balances({})

export const useBalancesByParams = (addressesByChain: AddressesByChain) => {
  const getChain = useSharedChainsCache()
  const getToken = useSharedTokensCache()

  const subscribe = useCallback(
    (subject: BehaviorSubject<Balances>) =>
      api.subscribeBalancesByParams(addressesByChain, async (update) => {
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
    [addressesByChain, getChain, getToken]
  )

  // subscrition must be reinitialized (using the key) if parameters change
  const subscriptionKey = useMemo(() => md5(JSON.stringify(addressesByChain)), [addressesByChain])

  const balances = useMessageSubscription(subscriptionKey, INITIAL_VALUE, subscribe)

  // debounce every 100ms to prevent hammering UI with updates
  const [debouncedBalances, setDebouncedBalances] = useState<Balances>(balances)
  useDebounce(() => setDebouncedBalances(balances), 100, [balances])

  return debouncedBalances
}
export default useBalancesByParams
