import { Balances } from "@core/domains/balances/types"
import { db } from "@core/libs/db"
import { api } from "@ui/api"
import { useChains } from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import { useTokens } from "@ui/hooks/useTokens"
import { useLiveQuery } from "dexie-react-hooks"
import { useMemo, useState } from "react"
import { useDebounce } from "react-use"

const subscribe = () => api.balances(() => {})
export const useBalances = () => {
  // make sure the rpcs are connected
  useMessageSubscription("balances", null, subscribe)

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

  const balances = useLiveQuery(
    async () => new Balances(await db.balances.toArray(), { chains, evmNetworks, tokens }),
    [chains, evmNetworks, tokens]
  )

  // debounce every 100ms to prevent hammering UI with updates
  const [debouncedBalances, setDebouncedBalances] = useState<Balances>(balances ?? new Balances([]))
  useDebounce(
    () => {
      if (balances) setDebouncedBalances(balances)
    },
    100,
    [balances]
  )

  return debouncedBalances
}
export default useBalances
