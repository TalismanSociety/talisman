import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { Button } from "talisman-ui"
import { ContactModalProps } from "./types"

export const ContactDeleteModal = ({ contact, isOpen, close }: ContactModalProps) => {
  const { deleteContact } = useAddressBook()

  return (
    <Modal open={isOpen} className="bg-black-secondary">
      <ModalDialog title="Delete contact">
        <div className="text-body-secondary my-12">
          You are deleting contact '<span className="font-bold text-white">{contact.name}</span>'
          from your address book.
        </div>
        <div className="flex items-stretch gap-4 pt-4">
          <Button fullWidth onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              close()
              deleteContact(contact)
            }}
            fullWidth
            primary
          >
            Confirm
          </Button>
        </div>
      </ModalDialog>
    </Modal>
  )
}
