import { Balances } from "@talismn/balances"
import md5 from "blueimp-md5"
import { AddressesAndTokens, BalanceSubscriptionResponse } from "extension-core"
import { useCallback, useMemo, useState } from "react"
import { useDebounce } from "react-use"
import { BehaviorSubject } from "rxjs"

import { api } from "@ui/api"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import { useBalancesHydrate } from "@ui/state"

const INITIAL_VALUE: BalanceSubscriptionResponse = {
  status: "initialising",
  balances: [],
  failedBalanceIds: [],
}

const DEFAULT_TOKENS_AND_ADDRESSES: AddressesAndTokens = { addresses: [], tokenIds: [] }

// TODO merge addressesByChain and addressesandNetworks into a single addressesByNetwork object, or just remove both
export type BalanceByParamsProps = {
  addressesAndTokens?: AddressesAndTokens
}

// This is used to fetch balances from accounts that are not in the keyring
export const useBalancesByParams = ({
  addressesAndTokens = DEFAULT_TOKENS_AND_ADDRESSES,
}: BalanceByParamsProps) => {
  const hydrate = useBalancesHydrate()

  const subscribe = useCallback(
    (subject: BehaviorSubject<BalanceSubscriptionResponse>) => {
      return api.balancesByParams(addressesAndTokens, (update) => subject.next(update))
    },
    [addressesAndTokens],
  )

  // subscription must be reinitialized (using the key) if parameters change
  const subscriptionKey = useMemo(
    () => `useBalancesByParams-${md5(JSON.stringify(addressesAndTokens))}`,
    [addressesAndTokens],
  )

  const data = useMessageSubscription(subscriptionKey, INITIAL_VALUE, subscribe)

  // debounce every 100ms to prevent hammering UI with updates
  const [debouncedBalances, setDebouncedBalances] = useState<BalanceSubscriptionResponse>(
    () => data,
  )
  useDebounce(() => setDebouncedBalances(data), 100, [data])

  return useMemo(
    () => ({
      status: debouncedBalances.status,
      balances: new Balances(debouncedBalances.balances, hydrate),
    }),
    [debouncedBalances, hydrate],
  )
}
