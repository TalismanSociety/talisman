import { AddressesByEvmNetwork, Balances } from "@core/domains/balances/types"
import { AddressesByChain } from "@core/types/base"
import { api } from "@ui/api"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import md5 from "blueimp-md5"
import { useCallback, useMemo, useState } from "react"
import { useDebounce } from "react-use"
import { BehaviorSubject } from "rxjs"
import { useBalancesHydrate } from "./useBalancesHydrate"

const INITIAL_VALUE = new Balances({})

const DEFAULT_BY_CHAIN = {}
const DEFAULT_By_EVM_NETWORK = { addresses: [], evmNetworks: [] }

type BalanceByParamsProps = {
  addressesByChain?: AddressesByChain
  addressesByEvmNetwork?: AddressesByEvmNetwork
}

// This is used to fetch balances from accounts that are not in the keyring
export const useBalancesByParams = ({
  addressesByChain = DEFAULT_BY_CHAIN,
  addressesByEvmNetwork = DEFAULT_By_EVM_NETWORK,
}: BalanceByParamsProps) => {
  const hydrate = useBalancesHydrate()

  const subscribe = useCallback(
    (subject: BehaviorSubject<Balances>) =>
      api.balancesByParams(addressesByChain, addressesByEvmNetwork, async (update) => {
        switch (update.type) {
          case "reset": {
            const newBalances = new Balances(update.balances, hydrate)
            return subject.next(newBalances)
          }

          case "upsert": {
            const newBalances = new Balances(update.balances, hydrate)
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
      }),
    [addressesByChain, addressesByEvmNetwork, hydrate]
  )

  // subscrition must be reinitialized (using the key) if parameters change
  const subscriptionKey = useMemo(
    () =>
      `useBalancesByParams-${md5(JSON.stringify(addressesByChain))}-${md5(
        JSON.stringify(addressesByEvmNetwork)
      )}`,
    [addressesByChain, addressesByEvmNetwork]
  )

  const balances = useMessageSubscription(subscriptionKey, INITIAL_VALUE, subscribe)

  // debounce every 100ms to prevent hammering UI with updates
  const [debouncedBalances, setDebouncedBalances] = useState<Balances>(() => balances)
  useDebounce(() => setDebouncedBalances(balances), 100, [balances])

  return debouncedBalances
}
export default useBalancesByParams
