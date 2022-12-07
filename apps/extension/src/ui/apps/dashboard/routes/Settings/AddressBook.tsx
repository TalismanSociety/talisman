import { AddressBookContact } from "@core/domains/app/store.addressBook"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import Layout from "@ui/apps/dashboard/layout"
import { FormattedAddress } from "@ui/domains/Account/FormattedAddress"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { TrashIcon, EditIcon } from "@talisman/theme/icons"
import { useState } from "react"
import { DeleteContactModal } from "@ui/domains/Settings/AddressBook/ContactDeleteModal"
import { ContactComponentProps } from "@ui/domains/Settings/AddressBook/types"

type ContactItemProps = ContactComponentProps & {
  handleDelete: (contact: AddressBookContact) => void
}

const AddressBookContactItem = ({ contact, handleDelete }: ContactItemProps) => (
  <div className="bg-black-secondary hover:bg-black-tertiary flex w-full justify-between rounded p-8">
    <FormattedAddress address={contact.address} />
    <div className="text-body-secondary flex gap-4">
      <EditIcon className="cursor-pointer" />
      <TrashIcon className="cursor-pointer" onClick={() => handleDelete(contact)} />
    </div>
  </div>
)

const AddressBook = () => {
  const { contacts } = useAddressBook()
  const [deletingContact, setDeletingContact] = useState<AddressBookContact>()

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
              handleDelete={setDeletingContact}
            />
          ))}
        </div>
      </Layout>
      {deletingContact && (
        <DeleteContactModal
          isOpen={!!deletingContact}
          close={() => setDeletingContact(undefined)}
          contact={deletingContact}
        />
      )}
    </>
  )
}

export default AddressBook
