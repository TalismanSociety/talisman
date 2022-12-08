import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import Layout from "@ui/apps/dashboard/layout"
import { FormattedAddress } from "@ui/domains/Account/FormattedAddress"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { TrashIcon, EditIcon } from "@talisman/theme/icons"
import { useMemo, useState } from "react"
import { ContactDeleteModal } from "@ui/domains/Settings/AddressBook/ContactDeleteModal"
import { ContactEditModal } from "@ui/domains/Settings/AddressBook/ContactEditModal"
import { ContactComponentProps } from "@ui/domains/Settings/AddressBook/types"

type ContactItemProps = ContactComponentProps & {
  handleDelete: (address: string) => void
  handleEdit: (address: string) => void
}

const AddressBookContactItem = ({ contact, handleDelete, handleEdit }: ContactItemProps) => (
  <div className="bg-black-secondary hover:bg-black-tertiary flex w-full justify-between rounded p-8">
    <FormattedAddress address={contact.address} />
    <div className="text-body-secondary flex gap-4">
      <EditIcon className="cursor-pointer" onClick={() => handleEdit(contact.address)} />
      <TrashIcon className="cursor-pointer" onClick={() => handleDelete(contact.address)} />
    </div>
  </div>
)

const AddressBook = () => {
  const { contacts } = useAddressBook()
  const contactsMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.address, c])),
    [contacts]
  )
  const [toDelete, setToDelete] = useState<string>()
  const [toEdit, setToEdit] = useState<string>()

  return (
    <>
      <Layout centered withBack backTo="/settings">
        <HeaderBlock title="Address Book" text="Manage your saved contacts" />
        <Spacer />
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => (
            <AddressBookContactItem
              contact={contact}
              key={contact.address}
              handleDelete={setToDelete}
              handleEdit={setToEdit}
            />
          ))}
        </div>
      </Layout>
      {toDelete && contactsMap[toDelete] && (
        <ContactDeleteModal
          isOpen={!!toDelete}
          close={() => setToDelete(undefined)}
          contact={contactsMap[toDelete]}
        />
      )}
      {toEdit && contactsMap[toEdit] && (
        <ContactEditModal
          isOpen={!!toEdit}
          close={() => setToEdit(undefined)}
          contact={contactsMap[toEdit]}
        />
      )}
    </>
  )
}

export default AddressBook
