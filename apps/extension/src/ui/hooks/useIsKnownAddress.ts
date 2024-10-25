import { AccountJson } from "@polkadot/extension-base/background/types"
import { isAddressEqual } from "@talismn/util"
import { useMemo } from "react"

import { AddressBookContact } from "@extension/core"
import { useAccountByAddress } from "@ui/state"

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
