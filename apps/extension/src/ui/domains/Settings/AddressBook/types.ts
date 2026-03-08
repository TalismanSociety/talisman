import type { AccountContact } from "@core/domains/keyring/exports"

type ModalProps = { isOpen: boolean; close: () => void }
export type ExistingContactComponentProps = { contact: AccountContact }
export type ContactComponentProps = Partial<ExistingContactComponentProps>
export type ContactModalProps = ContactComponentProps & ModalProps
export type ExistingContactModalProps = ExistingContactComponentProps & ModalProps
