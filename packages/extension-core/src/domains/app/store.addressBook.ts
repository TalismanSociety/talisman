import { AccountAddressType } from "extension-shared"

import { StorageProvider } from "../../libs/Store"

type Address = string
export type AddressBookContact = {
  addressType: AccountAddressType
  address: Address
  genesisHash?: string
  name: string
}

type AddressBookData = Record<Address, AddressBookContact>

export const addressBookStore = new StorageProvider<AddressBookData>("addressBook")
