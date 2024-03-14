import { useChaindataProvider } from "@talismn/balances-react"
import type { CustomChain, CustomEvmNetwork, Token } from "@talismn/chaindata-provider"
import { useEffect } from "react"

const windowInject = globalThis as typeof globalThis & {
  talismanSub?: {
    subscribeCustomSubstrateChains?: (cb: (chains: CustomChain[]) => unknown) => () => void
    subscribeCustomEvmNetworks?: (cb: (networks: CustomEvmNetwork[]) => unknown) => () => void
    subscribeCustomTokens?: (cb: (tokens: Token[]) => unknown) => () => void
  }
}

export const useExtensionSyncCustomChaindata = () => {
  const chaindataProvider = useChaindataProvider()

  useEffect(() => {
    const sub = windowInject.talismanSub

    const unsubs = [
      sub?.subscribeCustomSubstrateChains?.((custom) => chaindataProvider.setCustomChains(custom)),
      sub?.subscribeCustomEvmNetworks?.((custom) => chaindataProvider.setCustomEvmNetworks(custom)),
      sub?.subscribeCustomTokens?.((custom) => chaindataProvider.setCustomTokens(custom)),
    ]

    return () => unsubs.forEach((unsub) => unsub?.())
  }, [chaindataProvider])

  return null
}
