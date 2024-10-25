import { encodeAnyAddress } from "@talismn/util"
import { useMemo } from "react"

import { AccountJsonAny } from "@extension/core"
import { useChainByGenesisHash } from "@ui/state"

export const useFormattedAddress = (address: string | undefined, genesisHash?: string | null) => {
  const chain = useChainByGenesisHash(genesisHash)
  const formattedAddress = useMemo(
    () => (address ? encodeAnyAddress(address, chain?.prefix ?? undefined) : undefined),
    [address, chain?.prefix],
  )

  return formattedAddress
}

export const useFormattedAddressForAccount = (account?: AccountJsonAny) =>
  useFormattedAddress(account?.address, account?.genesisHash)
