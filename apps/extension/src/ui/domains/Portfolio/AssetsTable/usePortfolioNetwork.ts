import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { useMemo } from "react"

import { usePortfolio } from "../context"

export const usePortfolioNetwork = (id: string | number) => {
  const { chains, evmNetworks } = usePortfolio()

  const { chain, evmNetwork }: { chain?: Chain; evmNetwork?: EvmNetwork } = useMemo(() => {
    const chain = chains?.find((c) => c.id === id)
    if (chain) return { chain }
    const evmNetwork = evmNetworks?.find((n) => n.id === id)
    if (evmNetwork) return { evmNetwork }
    return { chain, evmNetwork }
  }, [chains, evmNetworks, id])

  const networkInfo = useMemo(() => {
    if (evmNetwork)
      return { label: evmNetwork.name, type: evmNetwork.isTestnet ? "Testnet" : "EVM blockchain" }

    if (chain) {
      if (chain.isTestnet) return { label: chain.name, type: "Testnet" }
      return { label: chain.name, type: chain.paraId ? "Parachain" : "Relay chain" }
    }

    return null
  }, [chain, evmNetwork])

  const logoId = useMemo(() => {
    const chain = chains?.find((c) => c.id === id)
    if (chain) return chain.id
    const evmNetwork = evmNetworks?.find((n) => n.id === id)
    if (evmNetwork) return evmNetwork.substrateChain?.id ?? evmNetwork.id
    return undefined
  }, [chains, evmNetworks, id])

  const network = useMemo(() => {
    if (!networkInfo) return null
    return {
      id,
      ...networkInfo,
      logoId,
    }
  }, [id, logoId, networkInfo])

  return network
}
