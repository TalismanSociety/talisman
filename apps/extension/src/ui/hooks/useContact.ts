import { convertAddress } from "@talisman/util/convertAddress"
import { useMemo } from "react"

import { useAddressBook } from "./useAddressBook"

export const useContact = (address?: string | null) => {
  const { contacts } = useAddressBook()

  return useMemo(() => {
    if (!address) return null
    const converted = convertAddress(address, null)
    return contacts?.find((c) => convertAddress(c.address, null) === converted) ?? null
  }, [address, contacts])
}
