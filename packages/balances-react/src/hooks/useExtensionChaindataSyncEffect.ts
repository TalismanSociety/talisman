import { CustomChain, CustomEvmNetwork, Token } from "@talismn/chaindata-provider"
import { useEffect } from "react"

import { useChaindata } from "./useChaindata"

const windowInject = globalThis as typeof globalThis & {
  talismanSub?: {
    subscribeCustomSubstrateChains?: (cb: (chains: CustomChain[]) => unknown) => () => void
    subscribeCustomEvmNetworks?: (cb: (networks: CustomEvmNetwork[]) => unknown) => () => void
    subscribeCustomTokens?: (cb: (tokens: Token[]) => unknown) => () => void
  }
}

const useExtensionChaindataSyncEffect = () => {
  const chaindata = useChaindata()

  useEffect(
    () =>
      windowInject.talismanSub?.subscribeCustomSubstrateChains?.((chains) =>
        chaindata.syncCustomChains(chains)
      ),
    [chaindata]
  )

  useEffect(
    () =>
      windowInject.talismanSub?.subscribeCustomEvmNetworks?.((networks) =>
        chaindata.syncCustomEvmNetworks(networks)
      ),
    [chaindata]
  )

  useEffect(
    () =>
      windowInject.talismanSub?.subscribeCustomTokens?.((tokens) =>
        chaindata.syncCustomTokens(tokens)
      ),
    [chaindata]
  )
}

export default useExtensionChaindataSyncEffect
