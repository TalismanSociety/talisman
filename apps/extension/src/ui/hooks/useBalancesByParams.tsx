import { AddressesByChain } from "@extension/core"
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

const INITIAL_VALUE = new Balances({})

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
    (subject: BehaviorSubject<Balances>) =>
      api.balancesByParams(
        addressesByChain,
        addressesAndEvmNetworks,
        addressesAndTokens,
        async (update) => {
          switch (update.type) {
            case "reset": {
              const newBalances = new Balances(update.balances)
              return subject.next(newBalances)
            }

            case "upsert": {
              const newBalances = new Balances(update.balances)
              return subject.next(subject.value.add(newBalances))
            }

            case "delete": {
              return subject.next(subject.value.remove(update.balances))
            }

            default: {
              const exhaustiveCheck: never = update
              throw new Error(`Unhandled BalancesUpdate type: ${exhaustiveCheck}`)
            }
          }
        }
      ),
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

  const balances = useMessageSubscription(subscriptionKey, INITIAL_VALUE, subscribe)

  // debounce every 100ms to prevent hammering UI with updates
  const [debouncedBalances, setDebouncedBalances] = useState<Balances>(() => balances)
  useDebounce(() => setDebouncedBalances(balances), 100, [balances])

  return useMemo(() => new Balances(debouncedBalances, hydrate), [debouncedBalances, hydrate])
}
