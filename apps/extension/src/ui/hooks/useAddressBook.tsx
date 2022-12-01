import { addressBookStore, AddressBookContact } from "@core/domains/app/store.addressBook"
import { useCallback, useEffect, useState } from "react"

export const useAddressBook = () => {
  const [contacts, setContacts] = useState<AddressBookContact[]>([])

  useEffect(() => {
    addressBookStore.observable.subscribe((data) => setContacts(Object.values(data)))
  }, [])

  const add = useCallback(async ({ address, ...rest }: AddressBookContact) => {
    return await addressBookStore.set({ [address]: { address, ...rest } })
  }, [])

  return {
    add,
    contacts,
  }
}
