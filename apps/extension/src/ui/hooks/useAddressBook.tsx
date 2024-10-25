import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { AddressBookContact, addressBookStore } from "@extension/core"
import { useContacts } from "@ui/state"

export const useAddressBook = () => {
  const { t } = useTranslation()
  const contacts = useContacts()

  const add = useCallback(
    ({ address, ...rest }: AddressBookContact) =>
      addressBookStore.set({ [address]: { address, ...rest } }),
    [],
  )

  const deleteContact = useCallback(
    ({ address }: { address: string }) => addressBookStore.delete(address),
    [],
  )

  const edit = useCallback(
    async ({
      address,
      name,
      genesisHash,
    }: Pick<AddressBookContact, "address" | "name" | "genesisHash">) => {
      const existing = await addressBookStore.get(address)
      if (!existing)
        throw new Error(t(`Contact with address {{address}} doesn't exist`, { address }))
      return await addressBookStore.set({ [address]: { ...existing, name, genesisHash } })
    },
    [t],
  )

  return {
    add,
    edit,
    deleteContact,
    contacts,
  }
}
