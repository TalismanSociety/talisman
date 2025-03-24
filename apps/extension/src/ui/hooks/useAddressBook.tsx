import { HexString } from "extension-shared"
import { useCallback } from "react"

import { api } from "@ui/api"
import { useContacts } from "@ui/state"

type ContactInfo = { address: string; name: string; genesisHash?: HexString }

export const useAddressBook = () => {
  const contacts = useContacts()

  const add = useCallback(
    ({ address, name, genesisHash }: ContactInfo) =>
      api.accountAddExternal([
        {
          type: "contact",
          name,
          address,
          genesisHash,
        },
      ]),
    [],
  )

  const deleteContact = useCallback(
    ({ address }: { address: string }) => api.accountForget(address),
    [],
  )

  const edit = useCallback(
    ({ address, name, genesisHash }: ContactInfo) =>
      api.accountUpdateContact({ address, name, genesisHash }),
    [],
  )

  return {
    add,
    edit,
    deleteContact,
    contacts,
  }
}
