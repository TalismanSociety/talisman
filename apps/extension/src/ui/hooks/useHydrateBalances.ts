import { ChainList } from "@core/domains/chains/types"
import { EvmNetworkList } from "@core/domains/ethereum/types"
import { TokenList } from "@core/domains/tokens/types"
import { useMemo } from "react"

import useChains from "./useChains"
import { useEvmNetworks } from "./useEvmNetworks"
import useTokens from "./useTokens"

export const useHydrateBalances = () => {
  const _chains = useChains()
  const _evmNetworks = useEvmNetworks()
  const _tokens = useTokens()

  const chains = useMemo(
    () => Object.fromEntries((_chains || []).map((chain) => [chain.id, chain])) as ChainList,
    [_chains]
  )
  const evmNetworks = useMemo(
    () =>
      Object.fromEntries(
        (_evmNetworks || []).map((evmNetwork) => [evmNetwork.id, evmNetwork])
      ) as EvmNetworkList,
    [_evmNetworks]
  )
  const tokens = useMemo(
    () => Object.fromEntries((_tokens || []).map((token) => [token.id, token])) as TokenList,
    [_tokens]
  )

  return { chains, evmNetworks, tokens }
}
