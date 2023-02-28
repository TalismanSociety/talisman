import { HydrateDb } from "@talismn/balances"
import { useMemo } from "react"

import { useChains } from "./useChains"
import { useEvmNetworks } from "./useEvmNetworks"
import { useTokenRates } from "./useTokenRates"
import { useTokens } from "./useTokens"

export const useBalancesHydrate = (withTestnets?: boolean): HydrateDb => {
  const chains = useChains(withTestnets)
  const evmNetworks = useEvmNetworks(withTestnets)
  const tokens = useTokens(withTestnets)
  const tokenRates = useTokenRates()

  return useMemo(
    () => ({ chains, evmNetworks, tokens, tokenRates }),
    [chains, evmNetworks, tokens, tokenRates]
  )
}
