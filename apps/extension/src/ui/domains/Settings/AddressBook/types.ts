import { AddressBookContact } from "@core/domains/app"

type ModalProps = { isOpen: boolean; close: () => void }
export type ExistingContactComponentProps = { contact: AddressBookContact }
export type ContactComponentProps = Partial<ExistingContactComponentProps>
export type ContactModalProps = ContactComponentProps & ModalProps
export type ExistingContactModalProps = ExistingContactComponentProps & ModalProps
