import { HydrateDb } from "@talismn/balances"
import { useMemo } from "react"

import { useChains } from "./useChains"
import { useEvmNetworks } from "./useEvmNetworks"
import useExtensionChaindataSyncEffect from "./useExtensionChaindataSyncEffect"
import { useTokenRates } from "./useTokenRates"
import { useTokens } from "./useTokens"
import { useWithTestnets } from "./useWithTestnets"

export const useBalancesHydrate = (): HydrateDb => {
  const { withTestnets } = useWithTestnets()
  const chains = useChains(withTestnets)
  const evmNetworks = useEvmNetworks(withTestnets)
  const tokens = useTokens(withTestnets)
  const tokenRates = useTokenRates()

  useExtensionChaindataSyncEffect()

  return useMemo(
    () => ({ chains, evmNetworks, tokens, tokenRates }),
    [chains, evmNetworks, tokens, tokenRates]
  )
}
