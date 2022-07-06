import { AddressesByChain, Balances } from "@core/types"
import { api } from "@ui/api"
import { useChains } from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import { useTokens } from "@ui/hooks/useTokens"
import md5 from "blueimp-md5"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { BehaviorSubject, firstValueFrom } from "rxjs"

const INITIAL_VALUE = new Balances({})

export const useBalancesByParams = (addressesByChain: AddressesByChain) => {
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
      api.balancesByParams(addressesByChain, async (update) => {
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
    [addressesByChain]
  )

  // subscrition must be reinitialized (using the key) if parameters change
  const subscriptionKey = useMemo(() => md5(JSON.stringify(addressesByChain)), [addressesByChain])

  return useMessageSubscription(subscriptionKey, INITIAL_VALUE, subscribe)
}
export default useBalancesByParams
