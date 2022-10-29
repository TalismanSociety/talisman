import { Balances } from "@core/domains/balances/types"
import { useState } from "react"
import { useDebounce } from "react-use"
import { useDbCache } from "./useDbData"
import { useDbDataSubscription } from "./useDbDataSubscription"

export const useBalances = () => {
  // keep db data up to date
  useDbDataSubscription("chains")
  useDbDataSubscription("evmNetworks")
  useDbDataSubscription("tokens")
  useDbDataSubscription("balances")

  const {
    allBalances,
    chainsMap: chains,
    evmNetworksMap: evmNetworks,
    tokensMap: tokens,
  } = useDbCache()

  const [balances, setBalances] = useState<Balances>(
    () => new Balances(allBalances, { chains, evmNetworks, tokens })
  )

  // debounce every 100ms to prevent hammering UI with updates
  useDebounce(() => setBalances(new Balances(allBalances, { chains, evmNetworks, tokens })), 100, [
    allBalances,
    chains,
    evmNetworks,
    tokens,
  ])

  return balances
}
export default useBalances
