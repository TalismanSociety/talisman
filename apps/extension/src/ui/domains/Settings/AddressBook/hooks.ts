import { decodeSs58Address, detectAddressEncoding } from "@talismn/crypto"
import { useMemo } from "react"

import { useNetworks } from "@ui/state"

export const useChainsFilteredByAddressPrefix = (address?: string) => {
  const chains = useNetworks({ platform: "polkadot" })

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
