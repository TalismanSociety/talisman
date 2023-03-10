import { ProviderType } from "@core/domains/sitesAuthorised/types"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { CopyIcon, MoreHorizontalIcon, UserPlusIcon } from "@talisman/theme/icons"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { AnalyticsPage } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import { Address } from "@ui/domains/Account/Address"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { ContactCreateModal } from "@ui/domains/Settings/AddressBook/ContactCreateModal"
import { ContactDeleteModal } from "@ui/domains/Settings/AddressBook/ContactDeleteModal"
import { ContactEditModal } from "@ui/domains/Settings/AddressBook/ContactEditModal"
import { ExistingContactComponentProps } from "@ui/domains/Settings/AddressBook/types"
import { ProviderTypeSwitch } from "@ui/domains/Site/ProviderTypeSwitch"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { PropsWithChildren, useMemo, useState } from "react"
import { PillButton } from "talisman-ui"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact list",
}

const SquareButton = ({ children }: PropsWithChildren) => (
  <span className="hover:bg-grey-700 flex h-[3.2rem] w-[3.2rem] cursor-pointer items-center justify-center rounded">
    {children}
  </span>
)

type ContactItemProps = ExistingContactComponentProps & {
  handleDelete: (address: string) => void
  handleEdit: (address: string) => void
}

const AddressBookContactItem = ({ contact, handleDelete, handleEdit }: ContactItemProps) => {
  const { open: openCopyAddressModal } = useAddressFormatterModal()
  const [hover, setHover] = useState(false)
  return (
    <div
      className="bg-black-secondary hover:bg-black-tertiary flex w-full items-center justify-between rounded p-8"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="gap flex gap-4">
        <AccountAvatar address={contact.address} />
        <div className="flex flex-col justify-between">
          <span>{contact.name}</span>
          <Address className="text-body-secondary text-xs" address={contact.address} />
        </div>
      </span>
      <div
        className={`text-body-secondary flex duration-300 ${hover ? "opacity-100" : "opacity-0"}`}
      >
        <SquareButton>
          <CopyIcon onClick={() => openCopyAddressModal(contact.address)} />
        </SquareButton>
        <SquareButton>
          <MoreHorizontalIcon />
        </SquareButton>
      </div>
    </div>
  )
}

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

      {toDelete && (
        <ContactDeleteModal
          isOpen={!!toDelete}
          close={() => setToDelete(undefined)}
          contact={contactsMap[toDelete]}
        />
      )}
      {toEdit && (
        <ContactEditModal
          isOpen={!!toEdit}
          close={() => setToEdit(undefined)}
          contact={contactsMap[toEdit]}
        />
      )}
      <ContactCreateModal isOpen={isOpen} close={close} />
    </>
  )
}

export default AddressBook
