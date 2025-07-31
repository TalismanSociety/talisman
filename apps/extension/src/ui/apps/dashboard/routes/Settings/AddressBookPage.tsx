import { detectAddressEncoding } from "@talismn/crypto"
import { CopyIcon, MoreHorizontalIcon, PlusIcon, SendIcon, UserPlusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
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

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { ContactCreateModal } from "@ui/domains/Settings/AddressBook/ContactCreateModal"
import { ContactDeleteModal } from "@ui/domains/Settings/AddressBook/ContactDeleteModal"
import { ContactEditModal } from "@ui/domains/Settings/AddressBook/ContactEditModal"
import { ExistingContactComponentProps } from "@ui/domains/Settings/AddressBook/types"
import { useViewOnExplorer } from "@ui/domains/ViewOnExplorer"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { useBalances, useContacts, useNetworkByGenesisHash } from "@ui/state"

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
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(
    undefined,
    undefined,
    undefined,
    contact.address,
  )
  const contactChain = useNetworkByGenesisHash(contact.genesisHash)
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

  const isMultiAddress = useMemo(() => {
    try {
      const encoding = detectAddressEncoding(contact.address)
      // for substrate addresses, if not network specific we can't know which address format to display
      if (encoding === "ss58" && !contact.genesisHash) return true
      return false
    } catch {
      return false
    }
  }, [contact])

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
          {isMultiAddress ? (
            <div className="text-body-secondary text-xs">{t("Multichain address")}</div>
          ) : (
            <Address
              className="text-body-secondary text-xs"
              address={contact.address}
              genesisHash={contact.genesisHash}
            />
          )}
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

const Content = () => {
  const { t } = useTranslation()
  // preload balances because of the send button
  useBalances("owned")

  const contacts = useContacts()
  const contactsMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.address, c])),
    [contacts],
  )
  const [toDelete, setToDelete] = useState<string>()
  const [toEdit, setToEdit] = useState<string>()
  const { open, isOpen, close } = useOpenClose()
  const contactsToDisplay = useMemo(
    () => contacts.concat().sort((a, b) => a.name.localeCompare(b.name)),
    [contacts],
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <>
      <HeaderBlock title={t("Address Book")} text={t("Manage your saved contacts")} />
      <Spacer large />
      <div className="flex justify-end align-middle">
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
            <span>{t("You have no saved contacts yet.")}</span>
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
