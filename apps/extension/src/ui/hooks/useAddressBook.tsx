import { AddressBookContact, addressBookStore } from "@core/domains/app/store.addressBook"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useEffect, useState } from "react"

export const useAddressBookProvider = () => {
  const [contacts, setContacts] = useState<AddressBookContact[]>([])

  useEffect(() => {
    const sub = addressBookStore.observable.subscribe((data) => setContacts(Object.values(data)))
    return () => sub.unsubscribe()
  }, [])

  const add = useCallback(async ({ address, ...rest }: AddressBookContact) => {
    return await addressBookStore.set({ [address]: { address, ...rest } })
  }, [])

  const deleteContact = useCallback(
    ({ address }: { address: string }) => addressBookStore.delete(address),
    []
  )

  const edit = useCallback(
    async ({ address, name }: Pick<AddressBookContact, "address" | "name">) => {
      const existing = await addressBookStore.get(address)
      if (!existing) throw new Error(`Contact with address ${address} doesn't exist`)
      return await addressBookStore.set({ [address]: { ...existing, name } })
    },
    []
  )

  return {
    add,
    edit,
    deleteContact,
    contacts,
  }
}

export const [AddressBookProvider, useAddressBook] = provideContext(useAddressBookProvider)
