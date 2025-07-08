import md5 from "blueimp-md5"
import {
  AddressesAndEvmNetworks,
  AddressesAndTokens,
  AddressesByChain,
  Balances,
  BalanceSubscriptionResponse,
} from "extension-core"
import { useCallback, useMemo, useState } from "react"
import { useDebounce } from "react-use"
import { BehaviorSubject } from "rxjs"

import { api } from "@ui/api"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import { useBalancesHydrate } from "@ui/state"

const INITIAL_VALUE: BalanceSubscriptionResponse = { status: "initialising", balances: [] }

const DEFAULT_BY_CHAIN: AddressesByChain = {}
const DEFAULT_EVM_NETWORKS_AND_ADDRESSES: AddressesAndEvmNetworks = {
  addresses: [],
  evmNetworks: [],
}
const DEFAULT_TOKENS_AND_ADDRESSES: AddressesAndTokens = { addresses: [], tokenIds: [] }

// TODO merge addressesByChain and addressesandNetworks into a single addressesByNetwork object, or just remove both
export type BalanceByParamsProps = {
  addressesByChain?: AddressesByChain
  addressesAndEvmNetworks?: AddressesAndEvmNetworks
  addressesAndTokens?: AddressesAndTokens
}

// This is used to fetch balances from accounts that are not in the keyring
export const useBalancesByParams = ({
  addressesByChain = DEFAULT_BY_CHAIN,
  addressesAndEvmNetworks = DEFAULT_EVM_NETWORKS_AND_ADDRESSES,
  addressesAndTokens = DEFAULT_TOKENS_AND_ADDRESSES,
}: BalanceByParamsProps) => {
  const hydrate = useBalancesHydrate()

  const subscribe = useCallback(
    (subject: BehaviorSubject<BalanceSubscriptionResponse>) => {
      return api.balancesByParams(
        addressesByChain,
        addressesAndEvmNetworks,
        addressesAndTokens,
        (update) => subject.next(update),
      )
    },
    [addressesByChain, addressesAndEvmNetworks, addressesAndTokens],
  )

  // subscription must be reinitialized (using the key) if parameters change
  const subscriptionKey = useMemo(
    () =>
      `useBalancesByParams-${md5(JSON.stringify({ addressesByChain, addressesAndEvmNetworks, addressesAndTokens }))}`,
    [addressesByChain, addressesAndEvmNetworks, addressesAndTokens],
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
