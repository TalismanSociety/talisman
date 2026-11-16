import {
  AlertCircleIcon,
  CreditCardIcon,
  ExpandIcon,
  GlobeIcon,
  HeadsetIcon,
  KeyIcon,
  LockIcon,
  PlusIcon,
  SendIcon,
  SettingsIcon,
  UsersIcon,
  XIcon,
} from "@talismn/icons"
import { api } from "@ui/api"
import { Drawer } from "@ui/components/Drawer"
import { IconButton } from "@ui/components/IconButton"
import { Nav, NavItem } from "@ui/components/Nav"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"
import { useRampsModal } from "@ui/domains/Ramps/useRampsModal"
import { useMnemonicsAllBackedUp } from "@ui/hooks/useMnemonicsAllBackedUp"
import { useOpenFullscreen } from "@ui/hooks/useOpenFullscreen"
import { usePopupNavOpenClose } from "@ui/hooks/usePopupNavOpenClose"
import { useAccounts } from "@ui/state/accounts"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { TalismanWhiteLogo } from "@ui/theme/logos"
import { closeIfEmbeddedPopup } from "@ui/util/closeIfEmbeddedPopup"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { HelpAndSupportDrawer, useHelpAndSupportDrawerOpenClose } from "./HelpAndSupportDrawer"

const FOOTER_BUTTON_CLASSNAME =
  "flex flex-1 items-center justify-center gap-4 p-10 text-body-secondary hover:bg-grey-800 hover:text-body"

export const NavigationDrawer: FC = () => {
  const { t } = useTranslation()
  const { isOpen, close } = usePopupNavOpenClose()
  const ownedAccounts = useAccounts("owned")

  const handleLock = useCallback(async () => {
    api.lock()
    window.close()
  }, [])

  const closeAfterNavigating = useCallback(() => {
    close()
    closeIfEmbeddedPopup()
  }, [close])

  const handleAddAccountClick = useCallback(() => {
    api.dashboardOpen("/accounts/add")
    closeAfterNavigating()
  }, [closeAfterNavigating])

  const handleAddressBookClick = useCallback(() => {
    api.dashboardOpen("/settings/address-book")
    closeAfterNavigating()
  }, [closeAfterNavigating])

  const handleSendFundsClick = useCallback(async () => {
    await api.sendFundsOpen({ entry: "nav_menu" })
    closeAfterNavigating()
  }, [closeAfterNavigating])

  const allBackedUp = useMnemonicsAllBackedUp()
  const handleBackupClick = useCallback(() => {
    api.dashboardOpen("/settings/mnemonics")
    closeAfterNavigating()
  }, [closeAfterNavigating])

  const handleSettingsClick = useCallback(() => {
    api.dashboardOpen("/settings/general")
    closeAfterNavigating()
  }, [closeAfterNavigating])

  const handleManageNetworksClick = useCallback(() => {
    api.dashboardOpen("/settings/networks-tokens/networks")
    closeAfterNavigating()
  }, [closeAfterNavigating])

  const handleFullscreenClick = useOpenFullscreen()
  const { open: openHelpAndSupport } = useHelpAndSupportDrawerOpenClose()

  const showBuySell = useFeatureFlag("BUY_CRYPTO")
  const { open: openRampsModal } = useRampsModal()
  const handleBuySellClick = useCallback(() => {
    openRampsModal({ entry: "nav_menu" })
    close()
  }, [openRampsModal, close])

  return (
    <>
      <Drawer
        analyticsId="navigation"
        className="h-full"
        containerId="main"
        anchor="bottom"
        isOpen={isOpen}
        onDismiss={close}
      >
        <div className="flex h-full w-full flex-col bg-black">
          <header className="box-border flex h-36 w-full items-center justify-between gap-6 border-grey-800 border-b px-12">
            <TalismanWhiteLogo className="h-6.25 w-auto" />
            <BuildVersionPill className="bg-primary/20 text-primary hover:bg-primary/30" />
            <div className="grow"></div>
            <IconButton onClick={close} aria-label={t("Close menu")}>
              <XIcon />
            </IconButton>
          </header>
          <div className="w-full grow overflow-hidden">
            {/* buttons must shrink height if necessary */}
            <Nav className="flex size-full flex-col overflow-hidden p-4">
              <NavItem icon={<PlusIcon />} onClick={handleAddAccountClick}>
                {t("Add Account")}
              </NavItem>
              {!!ownedAccounts.length && (
                <NavItem icon={<SendIcon />} onClick={handleSendFundsClick}>
                  {t("Send Funds")}
                </NavItem>
              )}
              {!!showBuySell && (
                <NavItem icon={<CreditCardIcon />} onClick={handleBuySellClick}>
                  {t("Buy/Sell")}
                </NavItem>
              )}
              <NavItem icon={<UsersIcon />} onClick={handleAddressBookClick}>
                {t("Address Book")}
              </NavItem>
              <NavItem icon={<GlobeIcon />} onClick={handleManageNetworksClick}>
                {t("Manage Networks")}
              </NavItem>
              <NavItem icon={<KeyIcon />} onClick={handleBackupClick}>
                <span className="flex items-center">
                  {t("Backup Wallet")}
                  {!allBackedUp && <AlertCircleIcon className="ml-2 inline text-primary text-sm" />}
                </span>
              </NavItem>
              <NavItem icon={<HeadsetIcon />} onClick={openHelpAndSupport}>
                {t("Help & Support")}
              </NavItem>
              <NavItem icon={<SettingsIcon />} onClick={handleSettingsClick}>
                {t("All Settings")}
              </NavItem>
            </Nav>
          </div>
          <footer className="flex items-center border-grey-800 border-t">
            <button type="button" className={FOOTER_BUTTON_CLASSNAME} onClick={handleLock}>
              <LockIcon className="text-md" />
              <span>{t("Lock Wallet")}</span>
            </button>
            <div className="h-12 w-px shrink-0 bg-grey-800" />
            <button
              type="button"
              className={FOOTER_BUTTON_CLASSNAME}
              onClick={handleFullscreenClick}
            >
              <ExpandIcon className="text-md" />
              <span>{t("Fullscreen")}</span>
            </button>
          </footer>
        </div>
      </Drawer>
      <HelpAndSupportDrawer />
    </>
  )
}
