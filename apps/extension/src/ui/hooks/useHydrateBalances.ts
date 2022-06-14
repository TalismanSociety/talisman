import { ChainsDb, EvmNetworksDb, TokensDb } from "@core/domains/balances/types"
import { useMemo } from "react"
import useChains from "./useChains"
import { useEvmNetworks } from "./useEvmNetworks"
import useTokens from "./useTokens"

export const useHydrateBalances = () => {
  const _chains = useChains()
  const _evmNetworks = useEvmNetworks()
  const _tokens = useTokens()

  const chains = useMemo(
    () => Object.fromEntries((_chains || []).map((chain) => [chain.id, chain])) as ChainsDb,
    [_chains]
  )
  const evmNetworks = useMemo(
    () =>
      Object.fromEntries(
        (_evmNetworks || []).map((evmNetwork) => [evmNetwork.id, evmNetwork])
      ) as EvmNetworksDb,
    [_evmNetworks]
  )
  const tokens = useMemo(
    () => Object.fromEntries((_tokens || []).map((token) => [token.id, token])) as TokensDb,
    [_tokens]
  )

  return { chains, evmNetworks, tokens }
}
