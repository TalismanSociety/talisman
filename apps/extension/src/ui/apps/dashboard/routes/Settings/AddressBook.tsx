import { ProviderType } from "@core/domains/sitesAuthorised/types"
import HeaderBlock from "@talisman/components/HeaderBlock"
import PopNav from "@talisman/components/PopNav"
import Spacer from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { CopyIcon, MoreHorizontalIcon, PlusIcon, UserPlusIcon } from "@talisman/theme/icons"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { api } from "@ui/api"
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
import { Button, PillButton } from "talisman-ui"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact list",
}

const SquareButton = ({ children }: PropsWithChildren) => (
  <button
    type="button"
    className="hover:bg-grey-700 flex h-[3.2rem] w-[3.2rem] cursor-pointer items-center justify-center rounded"
  >
    {children}
  </button>
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
        <PopNav
          trigger={
            <SquareButton>
              <MoreHorizontalIcon />
            </SquareButton>
          }
          className="icon more"
          noPadding
          closeOnMouseOut
        >
          <PopNav.Item
            className="hover:bg-black-tertiary"
            onClick={() => handleEdit(contact.address)}
          >
            Edit contact
          </PopNav.Item>
          <PopNav.Item
            className="hover:bg-black-tertiary"
            onClick={() => api.sendFundsOpen({ to: contact.address })}
          >
            Send to this contact
          </PopNav.Item>
          <PopNav.Item
            className="hover:bg-black-tertiary"
            onClick={() => openCopyAddressModal(contact.address)}
          >
            Copy Address
          </PopNav.Item>
          <PopNav.Item
            className="hover:bg-black-tertiary"
            onClick={() => handleDelete(contact.address)}
          >
            Delete Contact
          </PopNav.Item>
        </PopNav>
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
  const contactactsToDisplay = useMemo(
    () =>
      contacts.filter((contact) => contact.addressType === contactTypeAddressTypeMap[addressType]),
    [contacts, addressType]
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <>
      <Layout centered withBack backTo="/settings" analytics={ANALYTICS_PAGE}>
        <HeaderBlock title="Address Book" text="Manage your saved contacts" />
        <div className="mt-4 flex justify-between align-middle">
          <ProviderTypeSwitch defaultProvider="polkadot" onChange={setAddressType} />
          {contactactsToDisplay.length > 0 && (
            <PillButton onClick={open} icon={UserPlusIcon}>
              Add new contact
            </PillButton>
          )}
        </div>
        <Spacer />
        <div className="flex flex-col gap-3">
          {contactactsToDisplay.map((contact) => (
            <AddressBookContactItem
              contact={contact}
              key={contact.address}
              handleDelete={setToDelete}
              handleEdit={setToEdit}
            />
          ))}
          {contactactsToDisplay.length === 0 && (
            <div className="bg-black-secondary text-body-secondary flex h-[16rem] w-full flex-col items-center justify-center gap-12 rounded px-16 py-8">
              <span>
                You have no saved {addressType[0].toUpperCase()}
                {addressType.slice(1)} contacts yet.
              </span>
              <Button primary onClick={open} iconLeft={PlusIcon}>
                Add a contact
              </Button>
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
