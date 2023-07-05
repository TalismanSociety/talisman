import { ProviderType } from "@core/domains/sitesAuthorised/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { CopyIcon, MoreHorizontalIcon, PlusIcon, UserPlusIcon } from "@talisman/theme/icons"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import { Address } from "@ui/domains/Account/Address"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { ContactCreateModal } from "@ui/domains/Settings/AddressBook/ContactCreateModal"
import { ContactDeleteModal } from "@ui/domains/Settings/AddressBook/ContactDeleteModal"
import { ContactEditModal } from "@ui/domains/Settings/AddressBook/ContactEditModal"
import { ExistingContactComponentProps } from "@ui/domains/Settings/AddressBook/types"
import { ProviderTypeSwitch } from "@ui/domains/Site/ProviderTypeSwitch"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import startCase from "lodash/startCase"
import { ButtonHTMLAttributes, FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  PillButton,
} from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact list",
}

const SquareButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button
    type="button"
    {...props}
    className={classNames(
      "hover:bg-grey-700 flex h-[3.2rem] w-[3.2rem] cursor-pointer items-center justify-center rounded",
      props.className
    )}
  >
    {children}
  </button>
)

type ContactItemProps = ExistingContactComponentProps & {
  handleDelete: (address: string) => void
  handleEdit: (address: string) => void
}

const AddressBookContactItem = ({ contact, handleDelete, handleEdit }: ContactItemProps) => {
  const { t } = useTranslation("admin")
  const { genericEvent } = useAnalytics()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const [hover, setHover] = useState(false)
  const { account } = useSelectedAccount()

  const handleCopyClick = useCallback(() => {
    openCopyAddressModal({
      mode: "copy",
      address: contact.address,
    })
    genericEvent("open copy address", { from: "address book" })
  }, [contact.address, genericEvent, openCopyAddressModal])

  const handleSendClick = useCallback(() => {
    // set currently selected account as from, unless address type mismatch or watched account
    const from =
      account &&
      account.origin !== "WATCHED" &&
      isEthereumAddress(account.address) === isEthereumAddress(contact.address)
        ? account.address
        : undefined
    api.sendFundsOpen({ to: contact.address, from })
  }, [account, contact.address])

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
          <CopyIcon onClick={handleCopyClick} />
        </SquareButton>
        <ContextMenu placement="bottom-end">
          <ContextMenuTrigger className="hover:bg-grey-700 flex h-[3.2rem] w-[3.2rem] cursor-pointer items-center justify-center rounded">
            <MoreHorizontalIcon />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => handleEdit(contact.address)}>
              {t("Edit contact")}
            </ContextMenuItem>
            <ContextMenuItem onClick={handleSendClick}>{t("Send to this contact")}</ContextMenuItem>
            <ContextMenuItem onClick={handleCopyClick}>{t("Copy address")}</ContextMenuItem>
            <ContextMenuItem onClick={() => handleDelete(contact.address)}>
              {t("Delete contact")}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </div>
  )
}

const contactTypeAddressTypeMap: Record<ProviderType, AccountAddressType> = {
  polkadot: "ss58",
  ethereum: "ethereum",
}

export const AddressBookPage = () => {
  const { t } = useTranslation("admin")
  const { contacts } = useAddressBook()
  const contactsMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.address, c])),
    [contacts]
  )
  const [toDelete, setToDelete] = useState<string>()
  const [toEdit, setToEdit] = useState<string>()
  const { open, isOpen, close } = useOpenClose()
  const [addressType, setAddressType] = useState<"polkadot" | "ethereum">("polkadot")
  const contactsToDisplay = useMemo(
    () =>
      contacts.filter((contact) => contact.addressType === contactTypeAddressTypeMap[addressType]),
    [contacts, addressType]
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <>
      <DashboardLayout centered withBack backTo="/settings" analytics={ANALYTICS_PAGE}>
        <HeaderBlock title={t("Address Book")} text={t("Manage your saved contacts")} />
        <div className="mt-4 flex justify-between align-middle">
          <ProviderTypeSwitch defaultProvider="polkadot" onChange={setAddressType} />
          {contactsToDisplay.length > 0 && (
            <PillButton onClick={open} icon={UserPlusIcon}>
              {t("Add new contact")}
            </PillButton>
          )}
        </div>
        <Spacer />
        <div className="flex flex-col gap-3">
          {contactsToDisplay.map((contact) => (
            <AddressBookContactItem
              contact={contact}
              key={contact.address}
              handleDelete={setToDelete}
              handleEdit={setToEdit}
            />
          ))}
          {contactsToDisplay.length === 0 && (
            <div className="bg-black-secondary text-body-secondary flex h-[16rem] w-full flex-col items-center justify-center gap-12 rounded px-16 py-8">
              <span>
                {t("You have no saved {{addressType}} contacts yet.", {
                  addressType: startCase(addressType),
                })}
              </span>
              <Button primary onClick={open} iconLeft={PlusIcon}>
                {t("Add a contact")}
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout>

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
