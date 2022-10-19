import { AddressesByEvmNetwork, Balances } from "@core/domains/balances/types"
import { AddressesByChain } from "@core/types/base"
import { api } from "@ui/api"
import { useChains } from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import { useTokens } from "@ui/hooks/useTokens"
import md5 from "blueimp-md5"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDebounce } from "react-use"
import { BehaviorSubject } from "rxjs"

const INITIAL_VALUE = new Balances({})

const DEFAULT_BY_CHAIN = {}
const DEFAULT_By_EVM_NETWORK = { addresses: [], evmNetworks: [] }

type BalanceByParamsProps = {
  addressesByChain?: AddressesByChain
  addressesByEvmNetwork?: AddressesByEvmNetwork
}

export const useBalancesByParams = ({
  addressesByChain = DEFAULT_BY_CHAIN,
  addressesByEvmNetwork = DEFAULT_By_EVM_NETWORK,
}: BalanceByParamsProps) => {
  const _chains = useChains()
  const _evmNetworks = useEvmNetworks()
  const _tokens = useTokens()

  const chains = useMemo(
    () => Object.fromEntries((_chains || []).map((chain) => [chain.id, chain])),
    [_chains]
  )
  const evmNetworks = useMemo(
    () => Object.fromEntries((_evmNetworks || []).map((evmNetwork) => [evmNetwork.id, evmNetwork])),
    [_evmNetworks]
  )
  const tokens = useMemo(
    () => Object.fromEntries((_tokens || []).map((token) => [token.id, token])),
    [_tokens]
  )

  const dbRef = useRef({ chains: {}, evmNetworks: {}, tokens: {} })
  useEffect(() => {
    dbRef.current.chains = chains
    dbRef.current.evmNetworks = evmNetworks
    dbRef.current.tokens = tokens
  }, [chains, evmNetworks, tokens])

  const subscribe = useCallback(
    (subject: BehaviorSubject<Balances>) =>
      api.balancesByParams(addressesByChain, addressesByEvmNetwork, async (update) => {
        switch (update.type) {
          case "reset": {
            const newBalances = new Balances(update.balances, dbRef.current)
            return subject.next(newBalances)
          }

          case "upsert": {
            const newBalances = new Balances(update.balances, dbRef.current)
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
    [addressesByChain, addressesByEvmNetwork]
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
  const [debouncedBalances, setDebouncedBalances] = useState<Balances>(balances)
  useDebounce(() => setDebouncedBalances(balances), 100, [balances])

  return debouncedBalances
}
export default useBalancesByParams
