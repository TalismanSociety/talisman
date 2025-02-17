import { encodeAnyAddress } from "@talismn/util"
import { Account, getAccountGenesisHash } from "extension-core"
import { useMemo } from "react"

import { useChainByGenesisHash } from "@ui/state"

export const useFormattedAddress = (address: string | undefined, genesisHash?: string | null) => {
  const chain = useChainByGenesisHash(genesisHash)
  const formattedAddress = useMemo(
    () => (address ? encodeAnyAddress(address, chain?.prefix ?? undefined) : undefined),
    [address, chain?.prefix],
  )

  return formattedAddress
}

export const useFormattedAddressForAccount = (account?: Account) =>
  useFormattedAddress(account?.address, getAccountGenesisHash(account))
