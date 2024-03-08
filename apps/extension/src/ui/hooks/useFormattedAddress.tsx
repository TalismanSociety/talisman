import { AccountJsonAny } from "@extension/core"
import { encodeAnyAddress } from "@talismn/util"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useMemo } from "react"

export const useFormattedAddress = (address: string | undefined, genesisHash?: string | null) => {
  const chain = useChainByGenesisHash(genesisHash)
  const formattedAddress = useMemo(
    () => (address ? encodeAnyAddress(address, chain?.prefix ?? undefined) : undefined),
    [address, chain?.prefix]
  )

  return formattedAddress
}

export const useFormattedAddressForAccount = (account?: AccountJsonAny) =>
  useFormattedAddress(account?.address, account?.genesisHash)
