import { AddressBookContact } from "@core/domains/app/store.addressBook"

export type ContactComponentProps = { contact: AddressBookContact }
export type ContactModalProps = ContactComponentProps & { isOpen: boolean; close: () => void }
