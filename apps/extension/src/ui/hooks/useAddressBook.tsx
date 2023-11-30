import { AddressBookContact, addressBookStore } from "@core/domains/app/store.addressBook"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
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
      if (!existing)
        throw new Error(t(`Contact with address {{address}} doesn't exist`, { address }))
      return await addressBookStore.set({ [address]: { ...existing, name } })
    },
    [t]
  )

  return {
    add,
    edit,
    deleteContact,
    contacts,
  }
}
