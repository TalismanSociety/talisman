import { Chain, CustomChain } from "@talismn/chaindata-provider"
import { decodeSs58Address, detectAddressEncoding, normalizeAddress } from "@talismn/crypto"
import { HexString } from "extension-shared"
import { useEffect, useMemo } from "react"

import { useChains } from "@ui/state"

export const useChainsFilteredByAddressPrefix = (address?: string) => {
  const chains = useChains()

  return useMemo(() => {
    if (!address) return []

    try {
      const encoding = detectAddressEncoding(address)
      if (encoding !== "ss58") return []

      const [, ss58Format] = decodeSs58Address(address)
      if (typeof ss58Format !== "number") return []

      // 42 is generic format
      if (ss58Format === 42) return chains
      return chains.filter((c) => c.prefix === ss58Format)
    } catch (err) {
      // invalid address
      return []
    }
  }, [address, chains])
}

export const useGenesisHashEffects = (
  chains: (Chain | CustomChain)[],
  genesisHash: HexString | undefined,
  setGenesisHash: (genesisHash?: HexString) => void,
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
  setLimitToNetwork: (limitToNetwork?: boolean) => void,
) => {
  useEffect(() => {
    try {
      const addressType = detectAddressEncoding(address)
      const isGeneric = addressType === "ss58" && address === normalizeAddress(address)

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
