import { StorageProvider } from "@core/libs/Store"
import { AccountAddressType } from "@talisman/util/getAddressType"

type Address = string
export type AddressBookContact = {
  addressType: AccountAddressType
  address: Address
  name: string
}

type AddressBookData = Record<Address, AddressBookContact>

export const addressBookStore = new StorageProvider<AddressBookData>("addressBook")
