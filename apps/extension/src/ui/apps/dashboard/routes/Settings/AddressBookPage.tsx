import { CopyIcon, MoreHorizontalIcon, PlusIcon, SendIcon, UserPlusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountAddressType } from "extension-shared"
import startCase from "lodash/startCase"
import {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  forwardRef,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  PillButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

import { ProviderType } from "@extension/core"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { OptionSwitch } from "@talisman/components/OptionSwitch"
import { Spacer } from "@talisman/components/Spacer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AnalyticsPage } from "@ui/api/analytics"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { ContactCreateModal } from "@ui/domains/Settings/AddressBook/ContactCreateModal"
import { ContactDeleteModal } from "@ui/domains/Settings/AddressBook/ContactDeleteModal"
import { ContactEditModal } from "@ui/domains/Settings/AddressBook/ContactEditModal"
import { ExistingContactComponentProps } from "@ui/domains/Settings/AddressBook/types"
import { useViewOnExplorer } from "@ui/domains/ViewOnExplorer"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { useBalances, useChainByGenesisHash } from "@ui/state"

import { DashboardLayout } from "../../layout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact list",
}

const SquareButton = forwardRef<
  HTMLButtonElement,
  DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
>((props, ref) => (
  <button
    {...props}
    type="button"
    ref={ref}
    className={classNames(
      "enabled:hover:bg-grey-700 enabled:hover:text-body-secondary flex h-[3.2rem] w-[3.2rem] items-center justify-center rounded-sm enabled:cursor-pointer disabled:cursor-not-allowed",
      props.className,
    )}
  ></button>
))
SquareButton.displayName = "SquareButton"

type ContactItemProps = ExistingContactComponentProps & {
  handleDelete: (address: string) => void
  handleEdit: (address: string) => void
}

const AddressBookContactItem = ({ contact, handleDelete, handleEdit }: ContactItemProps) => {
  const { t } = useTranslation("admin")
  const { genericEvent } = useAnalytics()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(
    undefined,
    undefined,
    undefined,
    contact.address,
  )
  const contactChain = useChainByGenesisHash(contact.genesisHash)
  const { open: viewOnExplorer, canOpen: canViewOnExplorer } = useViewOnExplorer(
    contact.address,
    contact.genesisHash,
  )

  const handleViewOnExplorer = useCallback(() => {
    viewOnExplorer()
    genericEvent("open view on explorer", { from: "address book" })
  }, [genericEvent, viewOnExplorer])

  const handleCopyClick = useCallback(() => {
    openCopyAddressModal({
      networkId: contactChain?.id,
      address: contact.address,
    })
    genericEvent("open copy address", { from: "address book" })
  }, [contact.address, contactChain?.id, genericEvent, openCopyAddressModal])

  return (
    <div className="bg-black-secondary group flex h-32 w-full items-center justify-between gap-4 rounded px-8">
      <AccountIcon
        className="text-xl"
        address={contact.address}
        genesisHash={contact.genesisHash}
      />
      <div className="flex grow flex-col justify-between overflow-hidden">
        <div className="truncate">{contact.name}</div>
        <div>
          <Address className="text-body-secondary text-xs" address={contact.address} />
        </div>
      </div>
      <div className={`text-body-disabled flex shrink-0 gap-2`}>
        <SquareButton onClick={handleCopyClick}>
          <CopyIcon />
        </SquareButton>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* wrap in a div because disabled buttons can't have tooltips */}
            <div>
              <SquareButton disabled={!canSendFunds} onClick={openSendFundsPopup}>
                <SendIcon />
              </SquareButton>
            </div>
          </TooltipTrigger>
          {cannotSendFundsReason && <TooltipContent>{cannotSendFundsReason}</TooltipContent>}
        </Tooltip>
        <ContextMenu placement="bottom-end">
          <ContextMenuTrigger asChild>
            <SquareButton>
              <MoreHorizontalIcon />
            </SquareButton>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <Suspense fallback={<SuspenseTracker name="AddressBookContactItem.ContextMenu" />}>
              <ContextMenuItem onClick={() => handleEdit(contact.address)}>
                {t("Edit contact")}
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!canSendFunds}
                onClick={openSendFundsPopup}
                className="disabled:!text-body-disabled disabled:!cursor-not-allowed disabled:!bg-transparent"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* wrap in a div to prevent a button inside button situation */}
                    <div>{t("Send to this contact")}</div>
                  </TooltipTrigger>
                  {/* TODO fix tooltip which appears behind context menu */}
                  {/* {cannotSendFundsReason && <TooltipContent>{cannotSendFundsReason}</TooltipContent>} */}
                </Tooltip>
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCopyClick}>{t("Copy address")}</ContextMenuItem>
              <ContextMenuItem
                disabled={!canViewOnExplorer}
                onClick={handleViewOnExplorer}
                className="disabled:!text-body-disabled disabled:!cursor-not-allowed disabled:!bg-transparent"
              >
                {t("View on explorer")}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleDelete(contact.address)}>
                {t("Delete contact")}
              </ContextMenuItem>
            </Suspense>
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

const Content = () => {
  const { t } = useTranslation("admin")
  // preload balances because of the send button
  useBalances("owned")

  const { contacts } = useAddressBook()
  const contactsMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.address, c])),
    [contacts],
  )
  const [toDelete, setToDelete] = useState<string>()
  const [toEdit, setToEdit] = useState<string>()
  const { open, isOpen, close } = useOpenClose()
  const [addressType, setAddressType] = useState<"all" | "polkadot" | "ethereum">("all")
  const contactsToDisplay = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          addressType === "all" || contact.addressType === contactTypeAddressTypeMap[addressType],
      ),
    [contacts, addressType],
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <>
      <HeaderBlock title={t("Address Book")} text={t("Manage your saved contacts")} />
      <Spacer large />
      <div className="flex justify-between align-middle">
        <OptionSwitch
          options={[
            ["all", t("All")],
            ["ethereum", t("Ethereum")],
            ["polkadot", t("Polkadot")],
          ]}
          className="text-xs [&>div]:h-full"
          defaultOption="all"
          onChange={setAddressType}
        />
        {contactsToDisplay.length > 0 && (
          <PillButton onClick={open} icon={UserPlusIcon}>
            {t("Add new contact")}
          </PillButton>
        )}
      </div>
      <Spacer small />
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

export const AddressBookPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
