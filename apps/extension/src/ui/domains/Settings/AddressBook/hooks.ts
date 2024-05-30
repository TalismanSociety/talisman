import { isEthereumAddress } from "@polkadot/util-crypto"
import { Chain, CustomChain } from "@talismn/chaindata-provider"
import { decodeSs58Format } from "@talismn/util"
import { useAllChains } from "@ui/hooks/useChains"
import { useEffect, useMemo } from "react"

export const useChainsFilteredByAddressPrefix = (address?: string) => {
  const chains = useAllChains()

  return useMemo(() => {
    if (!address) return []
    if (isEthereumAddress(address)) return []

    const ss58Format = decodeSs58Format(address)
    if (typeof ss58Format !== "number") return []

    if (ss58Format === 42) return chains
    return chains.filter((c) => c.prefix === ss58Format)
  }, [address, chains])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useGenesisHashEffects = (
  chains: (Chain | CustomChain)[],
  genesisHash: string | undefined,
  setGenesisHash: (genesisHash?: string) => void
) => {
  useEffect(() => {
    // If there's only 1 chain to pick from, immediately pick it
    if (chains.length === 1) return setGenesisHash(chains[0]?.genesisHash ?? undefined)

    // If there's 0 chains with the selected genesisHash, unselect it
    if (!genesisHash) return
    if (chains.some((c) => c.genesisHash === genesisHash)) return
    setGenesisHash(undefined)
  }, [chains, genesisHash, setGenesisHash])
}
