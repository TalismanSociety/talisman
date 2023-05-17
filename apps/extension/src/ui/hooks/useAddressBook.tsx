import { AddressBookContact, addressBookStore } from "@core/domains/app/store.addressBook"
import { useCallback } from "react"
import { atom, useRecoilValue } from "recoil"

export const addressBookState = atom<AddressBookContact[]>({
  key: "addressBookState",
  default: [],
  effects: [
    ({ setSelf }) => {
      const sub = addressBookStore.observable.subscribe((data) => setSelf(Object.values(data)))
      return () => sub.unsubscribe()
    },
  ],
})

export const useAddressBook = () => {
  const contacts = useRecoilValue(addressBookState)

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
