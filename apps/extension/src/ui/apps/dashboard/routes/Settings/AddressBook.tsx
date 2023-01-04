import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { EditIcon, TrashIcon } from "@talisman/theme/icons"
import { AnalyticsPage } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import { FormattedAddress } from "@ui/domains/Account/FormattedAddress"
import { ContactDeleteModal } from "@ui/domains/Settings/AddressBook/ContactDeleteModal"
import { ContactEditModal } from "@ui/domains/Settings/AddressBook/ContactEditModal"
import { ContactComponentProps } from "@ui/domains/Settings/AddressBook/types"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useMemo, useState } from "react"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact list",
}

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

  useAnalyticsPageView(ANALYTICS_PAGE)

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
          {contacts.length === 0 && (
            <div className="bg-black-secondary flex w-full justify-between rounded p-8">
              No address book contacts have been saved yet. You can add new contacts when you're
              sending funds in Talisman.
            </div>
          )}
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
