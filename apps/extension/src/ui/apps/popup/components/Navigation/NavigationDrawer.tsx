import { TALISMAN_WEB_APP_NFTS_URL, TALISMAN_WEB_APP_TRANSPORT_URL } from "@core/constants"
import { Nav, NavItem } from "@talisman/components/Nav"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { FullColorSmallLogo } from "@talisman/theme/logos"
import {
  AlertCircleIcon,
  ExternalLinkIcon,
  ImageIcon,
  KeyIcon,
  LockIcon,
  PlusIcon,
  RepeatIcon,
  SendIcon,
  SettingsIcon,
  UsersIcon,
  XIcon,
} from "@talismn/icons"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useNavigationContext } from "@ui/apps/popup/context/NavigationContext"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Drawer } from "talisman-ui"
import { IconButton } from "talisman-ui"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Navigation",
  featureVersion: 3,
  page: "Portfolio",
}

export const NavigationDrawer: FC = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useNavigationContext()

  const handleLock = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Interact",
      action: "Lock wallet",
    })
    api.lock()
    window.close()
  }, [])

  const handleAddAccountClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add account button",
    })
    api.dashboardOpen("/accounts/add")
    window.close()
  }, [])

  const handleAddressBookClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Address Book button",
    })
    api.dashboardOpen("/settings/address-book")
    window.close()
  }, [])

  const handleSendFundsClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Send Funds button",
    })
    await api.sendFundsOpen()
    window.close()
  }, [])

  const handleTransportClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Transport button",
    })
    window.open(TALISMAN_WEB_APP_TRANSPORT_URL, "_blank")
    window.close()
  }, [])

  const handleNftClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "NFTs button",
    })
    window.open(TALISMAN_WEB_APP_NFTS_URL, "_blank")
    window.close()
  }, [])

  const { allBackedUp } = useMnemonicBackup()
  const handleBackupClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Backup Wallet button",
    })
    api.dashboardOpen("/settings/mnemonics")
    window.close()
  }, [])

  const handleSettingsClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Settings button",
    })
    api.dashboardOpen("/settings/general")
    window.close()
  }, [])

  return (
    <Drawer className="h-full" containerId="main" anchor="bottom" isOpen={isOpen} onDismiss={close}>
      <div className="flex h-full w-full flex-col bg-black">
        <header className="border-grey-800 box-border flex h-36 w-full items-center justify-between gap-6 border-b px-12">
          <FullColorSmallLogo className="h-[2.5rem] w-auto" />
          <BuildVersionPill className="bg-primary/20 text-primary hover:bg-primary/30" />
          <div className="grow"></div>
          <IconButton onClick={close} aria-label={t("Close menu")}>
            <XIcon />
          </IconButton>
        </header>
        <ScrollContainer className="flex-grow">
          <Nav className="p-4">
            <NavItem icon={<PlusIcon />} onClick={handleAddAccountClick}>
              {t("Add Account")}
            </NavItem>
            <NavItem icon={<SendIcon />} onClick={handleSendFundsClick}>
              {t("Send Funds")}
            </NavItem>
            <NavItem icon={<UsersIcon />} onClick={handleAddressBookClick}>
              {t("Address Book")}
            </NavItem>
            <NavItem icon={<RepeatIcon />} onClick={handleTransportClick}>
              <span className="flex items-center gap-2">
                {t("Transport")}
                <ExternalLinkIcon />
              </span>
            </NavItem>
            <NavItem icon={<ImageIcon />} onClick={handleNftClick}>
              <span className="flex items-center gap-2">
                {t("NFTs")}
                <ExternalLinkIcon />
              </span>
            </NavItem>
            <NavItem icon={<KeyIcon />} onClick={handleBackupClick}>
              <span className="flex items-center">
                {t("Backup Wallet")}
                {!allBackedUp && <AlertCircleIcon className="text-primary ml-2 inline text-sm" />}
              </span>
            </NavItem>
            <NavItem icon={<SettingsIcon />} onClick={handleSettingsClick}>
              {t("Settings")}
            </NavItem>
          </Nav>
        </ScrollContainer>
        <footer>
          <button
            type="button"
            className="text-body-secondary hover:bg-grey-800 hover:text-body flex w-full flex-col items-center"
            onClick={handleLock}
          >
            <div className="border-1 border-grey-800 h-0 w-11/12 border-t" />
            <div className="flex w-full items-end justify-center gap-6 rounded-none py-12 pr-4 text-center">
              <LockIcon className="text-lg" />
              <span>{t("Lock Wallet")}</span>
            </div>
          </button>
        </footer>
      </div>
    </Drawer>
  )
}
