import { Balances } from "@core/types"
import { api } from "@ui/api"
import { useChains } from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import { useTokens } from "@ui/hooks/useTokens"
import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@core/libs/db"

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

  return useLiveQuery(
    async () => new Balances(await db.balances.toArray(), { chains, evmNetworks, tokens }),
    [chains, evmNetworks, tokens]
  )
}
export default useBalances
