import { AddressBookContact } from "@extension/core"

type ModalProps = { isOpen: boolean; close: () => void }
export type ExistingContactComponentProps = { contact: AddressBookContact }
export type ContactComponentProps = Partial<ExistingContactComponentProps>
export type ContactModalProps = ContactComponentProps & ModalProps
export type ExistingContactModalProps = ExistingContactComponentProps & ModalProps
