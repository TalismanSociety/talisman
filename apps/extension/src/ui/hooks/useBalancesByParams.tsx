import { AddressesByChain, BalanceSubscriptionResponse } from "@extension/core"
import {
  AddressesAndTokens,
  Balances,
  AddressesAndEvmNetwork as EvmNetworksAndAddresses,
} from "@extension/core"
import { api } from "@ui/api"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import md5 from "blueimp-md5"
import { useCallback, useMemo, useState } from "react"
import { useDebounce } from "react-use"
import { BehaviorSubject } from "rxjs"

import { useBalancesHydrate } from "./useBalancesHydrate"

const INITIAL_VALUE: BalanceSubscriptionResponse = { status: "initialising", data: [] }

const DEFAULT_BY_CHAIN: AddressesByChain = {}
const DEFAULT_EVM_NETWORKS_AND_ADDRESSES: EvmNetworksAndAddresses = {
  addresses: [],
  evmNetworks: [],
}
const DEFAULT_TOKENS_AND_ADDRESSES: AddressesAndTokens = { addresses: [], tokenIds: [] }

export type BalanceByParamsProps = {
  addressesByChain?: AddressesByChain
  addressesAndEvmNetworks?: EvmNetworksAndAddresses
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
        async (update) => {
          return subject.next(update)
        }
      )
    },
    [addressesByChain, addressesAndEvmNetworks, addressesAndTokens]
  )

  // subscription must be reinitialized (using the key) if parameters change
  const subscriptionKey = useMemo(
    () =>
      `useBalancesByParams-${md5(JSON.stringify(addressesByChain))}-${md5(
        JSON.stringify(addressesAndEvmNetworks)
      )}-${md5(JSON.stringify(addressesAndTokens))}`,
    [addressesByChain, addressesAndEvmNetworks, addressesAndTokens]
  )

  const data = useMessageSubscription(subscriptionKey, INITIAL_VALUE, subscribe)

  // debounce every 100ms to prevent hammering UI with updates
  const [debouncedBalances, setDebouncedBalances] = useState<BalanceSubscriptionResponse>(
    () => data
  )
  useDebounce(() => setDebouncedBalances(data), 100, [data])

  return useMemo(
    () => ({
      status: debouncedBalances.status,
      balances: new Balances(debouncedBalances.data, hydrate),
    }),
    [debouncedBalances, hydrate]
  )
}
