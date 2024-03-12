import { AddressBookContact } from "@extension/core"
import { AccountJson } from "@polkadot/extension-base/background/types"
import { convertAddress } from "@talisman/util/convertAddress"
import { useMemo } from "react"

import { useAccountByAddress } from "./useAccountByAddress"
import { useAddressBook } from "./useAddressBook"

type IsKnownAccount = {
  type: "account"
  value: AccountJson
}

type IsKnownContact = {
  type: "contact"
  value: AddressBookContact
}

export const useIsKnownAddress = (
  address?: string | null
): IsKnownAccount | IsKnownContact | false => {
  const localAccount = useAccountByAddress(address)
  const { contacts } = useAddressBook()
  const contactAddress = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          address && convertAddress(contact.address, null) === convertAddress(address, null)
      )[0],
    [contacts, address]
  )
  if (localAccount)
    return {
      type: "account",
      value: localAccount,
    }

  if (contactAddress)
    return {
      type: "contact",
      value: contactAddress,
    }

  return false
}
