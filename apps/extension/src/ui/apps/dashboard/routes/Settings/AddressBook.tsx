import { ProviderType } from "@core/domains/sitesAuthorised/types"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { EditIcon, TrashIcon, UserPlusIcon } from "@talisman/theme/icons"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { AnalyticsPage } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import { FormattedAddress } from "@ui/domains/Account/FormattedAddress"
import { ContactCreateModal } from "@ui/domains/Settings/AddressBook/ContactCreateModal"
import { ContactDeleteModal } from "@ui/domains/Settings/AddressBook/ContactDeleteModal"
import { ContactEditModal } from "@ui/domains/Settings/AddressBook/ContactEditModal"
import { ExistingContactComponentProps } from "@ui/domains/Settings/AddressBook/types"
import { ProviderTypeSwitch } from "@ui/domains/Site/ProviderTypeSwitch"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useMemo, useState } from "react"
import { Button, PillButton } from "talisman-ui"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact list",
}

type ContactItemProps = ExistingContactComponentProps & {
  handleDelete: (address: string) => void
  handleEdit: (address: string) => void
}

const AddressBookContactItem = ({ contact, handleDelete, handleEdit }: ContactItemProps) => (
  <div className="bg-black-secondary hover:bg-black-tertiary flex w-full items-center justify-between rounded p-8">
    <FormattedAddress address={contact.address} />
    <div className="text-body-secondary flex gap-6">
      <EditIcon className="cursor-pointer" onClick={() => handleEdit(contact.address)} />
      <TrashIcon className="cursor-pointer" onClick={() => handleDelete(contact.address)} />
    </div>
  </div>
)

const contactTypeAddressTypeMap: Record<ProviderType, AccountAddressType> = {
  polkadot: "ss58",
  ethereum: "ethereum",
}

const AddressBook = () => {
  const { contacts } = useAddressBook()
  const contactsMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.address, c])),
    [contacts]
  )
  const [toDelete, setToDelete] = useState<string>()
  const [toEdit, setToEdit] = useState<string>()
  const { open, isOpen, close } = useOpenClose()
  const [addressType, setAddressType] = useState<"polkadot" | "ethereum">("polkadot")

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <>
      <Layout centered withBack backTo="/settings" analytics={ANALYTICS_PAGE}>
        <HeaderBlock title="Address Book" text="Manage your saved contacts" />
        <div className="mt-4 flex justify-between align-middle">
          <ProviderTypeSwitch defaultProvider="polkadot" onChange={setAddressType} />
          <PillButton onClick={open} icon={UserPlusIcon}>
            Add new contact
          </PillButton>
        </div>
        <Spacer />
        <div className="flex flex-col gap-3">
          {contacts
            .filter((contact) => contact.addressType === contactTypeAddressTypeMap[addressType])
            .map((contact) => (
              <AddressBookContactItem
                contact={contact}
                key={contact.address}
                handleDelete={setToDelete}
                handleEdit={setToEdit}
              />
            ))}
          {contacts.length === 0 && (
            <div className="bg-black-secondary flex w-full justify-between rounded p-8">
              You have no saved contacts yet. You can save contacts when sending funds and they'll
              appear here.
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
      {isOpen && ( // need to unmount the component as well as just closing it to clear the form state
        <ContactCreateModal isOpen={isOpen} close={close} />
      )}
    </>
  )
}

export default AddressBook
