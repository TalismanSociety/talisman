import { isAddressEqual } from "@talismn/util"
import { useMemo } from "react"

import { Account, AddressBookContact } from "@extension/core"
import { useAccountByAddress } from "@ui/state"

import { useAddressBook } from "./useAddressBook"

type IsKnownAccount = {
  type: "account"
  value: Account
}

type IsKnownContact = {
  type: "contact"
  value: AddressBookContact
}

// TODO yeet address book store
export const useIsKnownAddress = (
  address?: string | null,
): IsKnownAccount | IsKnownContact | false => {
  const localAccount = useAccountByAddress(address)
  const { contacts } = useAddressBook()
  const contactAddress = useMemo(
    () =>
      (!localAccount &&
        address &&
        contacts.find((contact) => isAddressEqual(contact.address, address))) ||
      null,
    [address, contacts, localAccount],
  )

  if (contactAddress)
    return {
      type: "contact",
      value: contactAddress,
    }

  if (localAccount)
    return {
      type: "account",
      value: localAccount,
    }

  return false
}
