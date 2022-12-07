import { StorageProvider } from "@core/libs/Store"
import { AccountAddressType } from "@talisman/util/getAddressType"

type Address = string
export type AddressBookContact = {
  addressType: AccountAddressType
  address: Address
  name: string
}

type AddressBookData = Record<Address, AddressBookContact>

export const addressBookStore = new StorageProvider<AddressBookData>("addressBook", {
  "13RDY9nrJpyTDBSUdBw12dGwhk19sGwsrVZ2bxkzYHBSagP2": {
    address: "13RDY9nrJpyTDBSUdBw12dGwhk19sGwsrVZ2bxkzYHBSagP2",
    addressType: "ss58",
    name: "Gav's Polkadot Address",
  },
  "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B": {
    address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    addressType: "ethereum",
    name: "Vitalik's Eth Address",
  },
})
