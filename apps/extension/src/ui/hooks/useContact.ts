import { convertAddress } from "@talisman/util/convertAddress"
import { useMemo } from "react"

import { useAddressBook } from "./useAddressBook"

export const useContact = (address?: string | null, genesisHash?: string | null) => {
  const { contacts } = useAddressBook()

  return useMemo(() => {
    if (!address) return null
    const converted = convertAddress(address, null)
    const contact = contacts?.find((c) => convertAddress(c.address, null) === converted) ?? null
    if (contact?.genesisHash && contact.genesisHash !== genesisHash) return null
    return contact
  }, [address, contacts, genesisHash])
}
