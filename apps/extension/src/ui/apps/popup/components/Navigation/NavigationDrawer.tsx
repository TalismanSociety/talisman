import {
  AlertCircleIcon,
  ExternalLinkIcon,
  GlobeIcon,
  KeyIcon,
  LockIcon,
  PlusIcon,
  RepeatIcon,
  SeekEyeIcon,
  SendIcon,
  SettingsIcon,
  StarsIcon,
  UsersIcon,
  XIcon,
} from "@talismn/icons"
import { TALISMAN_WEB_APP_SWAP_URL } from "extension-shared"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Drawer, IconButton } from "talisman-ui"

import { Nav, NavItem } from "@talisman/components/Nav"
import { TalismanWhiteLogo } from "@talisman/theme/logos"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"
import { useSeekBenefitsModal } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsModal"
import { useMnemonicsAllBackedUp } from "@ui/hooks/useMnemonicsAllBackedUp"
import { usePopupNavOpenClose } from "@ui/hooks/usePopupNavOpenClose"
import { useAccounts, useFeatureFlag } from "@ui/state"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Navigation",
  featureVersion: 3,
  page: "Portfolio",
}

export const NavigationDrawer: FC = () => {
  const { t } = useTranslation()
  const { isOpen, close } = usePopupNavOpenClose()
  const ownedAccounts = useAccounts("owned")

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

  // TODO: Make this button open in-wallet swaps when we have feature parity with Portal
  // const canSwap = useFeatureFlag("SWAPS")
  // import { useSwapTokensModal } from "@ui/domains/Swap/hooks/useSwapTokensModal"
  // const { open: openSwapTokensModal } = useSwapTokensModal()
  const handleSwapClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Swap button",
    })

    /*if (!canSwap) */ return window.open(TALISMAN_WEB_APP_SWAP_URL, "_blank"), window.close()

    // await openSwapTokensModal()
    // import { sleep } from "@talismn/util"
    // await sleep(150)
    // close()
  }, [])

  const allBackedUp = useMnemonicsAllBackedUp()
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

  const handleManageNetworksClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Manage Networks button",
    })
    api.dashboardOpen("/settings/networks-tokens/networks")
    window.close()
  }, [])

  const navigate = useNavigate()
  const handleLatestFeaturesClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Latest Features button",
    })
    navigate("/whats-new")
    close()
  }, [close, navigate])

  const showSeekBenefits = useFeatureFlag("SEEK_BENEFITS")
  const { open: openSeekBenefitsModal } = useSeekBenefitsModal()
  const handleSeekBenefitsClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Seek Benefits" })
    openSeekBenefitsModal()
    close()
  }, [openSeekBenefitsModal, close])

  return (
    <Drawer className="h-full" containerId="main" anchor="bottom" isOpen={isOpen} onDismiss={close}>
      <div className="flex h-full w-full flex-col bg-black">
        <header className="border-grey-800 box-border flex h-36 w-full items-center justify-between gap-6 border-b px-12">
          <TalismanWhiteLogo className="h-[2.5rem] w-auto" />
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
            <NavItem icon={<RepeatIcon />} onClick={handleSwapClick}>
              <span className="flex items-center gap-2">
                {t("Swap")}
                {/*!canSwap && */ <ExternalLinkIcon />}
              </span>
            </NavItem>
            <NavItem icon={<UsersIcon />} onClick={handleAddressBookClick}>
              {t("Address Book")}
            </NavItem>
            <NavItem icon={<GlobeIcon />} onClick={handleManageNetworksClick}>
              {t("Manage Networks")}
            </NavItem>

            <NavItem icon={<KeyIcon />} onClick={handleBackupClick}>
              <span className="flex items-center">
                {t("Backup Wallet")}
                {!allBackedUp && <AlertCircleIcon className="text-primary ml-2 inline text-sm" />}
              </span>
            </NavItem>
            <NavItem icon={<StarsIcon />} onClick={handleLatestFeaturesClick}>
              {t("Latest Features")}
            </NavItem>
            {!!showSeekBenefits && (
              <NavItem
                className="hover:bg-primary/10"
                icon={<SeekEyeIcon className="text-primary" />}
                onClick={handleSeekBenefitsClick}
              >
                <span className="text-primary font-bold">SEEK</span>
              </NavItem>
            )}
            <NavItem icon={<SettingsIcon />} onClick={handleSettingsClick}>
              {t("All Settings")}
            </NavItem>
          </Nav>
        </div>
        <footer>
          <button
            type="button"
            className="text-body-secondary hover:bg-grey-800 hover:text-body flex w-full flex-col items-center"
            onClick={handleLock}
          >
            <div className="border-1 border-grey-800 h-0 w-11/12 border-t" />
            <div className="flex w-full items-center justify-center gap-4 p-10">
              <LockIcon className="text-md" />
              <span>{t("Lock Wallet")}</span>
            </div>
          </button>
        </footer>
      </div>
    </Drawer>
  )
}
