import { StorageProvider } from "../../libs/Store"

type Address = string

/**
 * @deprecated use keyring instead
 */
export type AddressBookContact = {
  addressType: "ss58" | "ethereum" | "UNKNOWN"
  address: Address
  genesisHash?: `0x${string}`
  name: string
}

type AddressBookData = Record<Address, AddressBookContact>

/**
 * @deprecated use keyring instead
 */
export const addressBookStore = new StorageProvider<AddressBookData>("addressBook")
