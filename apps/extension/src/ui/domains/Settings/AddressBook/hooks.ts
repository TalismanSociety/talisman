import { isEthereumAddress } from "@polkadot/util-crypto"
import { Chain, CustomChain } from "@talismn/chaindata-provider"
import { convertAddress, decodeSs58Format } from "@talismn/util"
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

export const useAddressEffects = (
  address: string,
  setLimitToNetwork: (limitToNetwork?: boolean) => void
) => {
  useEffect(() => {
    try {
      const addressType = address ? (isEthereumAddress(address) ? "ethereum" : "ss58") : "UNKNOWN"
      const isGeneric = addressType === "ss58" && address === convertAddress(address, null)

      // If address is a generic address, disable limitToNetwork by default
      if (isGeneric) setLimitToNetwork(false)

      // If address is a chain-formatted address, enable limitToNetwork by default
      if (!isGeneric) setLimitToNetwork(true)
    } catch {
      // If address is not even a valid address, disable limitToNetwork by default
      setLimitToNetwork(false)
    }
  }, [address, setLimitToNetwork])
}
