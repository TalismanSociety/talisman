import { AddressBookContact, addressBookStore } from "@core/domains/app/store.addressBook"
import { atomWithSubscription } from "@ui/atoms/utils/atomWithSubscription"
import { useAtomValue } from "jotai"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

export const addressBookAtom = atomWithSubscription<AddressBookContact[]>((callback) => {
  const { unsubscribe } = addressBookStore.observable.subscribe((data) =>
    callback(Object.values(data))
  )
  return unsubscribe
}, "addressBookAtom")

export const useAddressBook = () => {
  const { t } = useTranslation()
  const contacts = useAtomValue(addressBookAtom)

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
