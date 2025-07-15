import { encodeAnyAddress } from "@talismn/crypto"
import { Account, getAccountGenesisHash } from "extension-core"
import { useMemo } from "react"

import { useNetworkByGenesisHash } from "@ui/state"

export const useFormattedAddress = (
  address: string | undefined,
  genesisHash?: `0x${string}` | null,
) => {
  const chain = useNetworkByGenesisHash(genesisHash)

  return useMemo(
    () => (address ? encodeAnyAddress(address, { ss58Format: chain?.prefix }) : undefined),
    [address, chain?.prefix],
  )
}

export const useFormattedAddressForAccount = (account?: Account) =>
  useFormattedAddress(account?.address, getAccountGenesisHash(account))
