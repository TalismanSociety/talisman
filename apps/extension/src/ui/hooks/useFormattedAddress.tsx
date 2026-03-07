import type { Account } from "@core/domains/keyring/exports"
import { getAccountGenesisHash } from "@core/domains/keyring/exports"
import { encodeAnyAddress } from "@talismn/crypto"
import { useNetworkByGenesisHash } from "@ui/state/chaindata"
import { useMemo } from "react"

export const useFormattedAddress = (
  address: string | undefined,
  genesisHash?: `0x${string}` | null
) => {
  const chain = useNetworkByGenesisHash(genesisHash)

  return useMemo(
    () => (address ? encodeAnyAddress(address, { ss58Format: chain?.prefix }) : undefined),
    [address, chain?.prefix]
  )
}

export const useFormattedAddressForAccount = (account?: Account) =>
  useFormattedAddress(account?.address, getAccountGenesisHash(account))
