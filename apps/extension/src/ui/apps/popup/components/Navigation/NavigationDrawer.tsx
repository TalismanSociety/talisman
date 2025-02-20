import {
  AlertCircleIcon,
  ExternalLinkIcon,
  GlobeIcon,
  KeyIcon,
  LockIcon,
  PlusIcon,
  QuestStarIcon,
  RepeatIcon,
  SendIcon,
  SettingsIcon,
  StarsIcon,
  UsersIcon,
  XIcon,
} from "@talismn/icons"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Drawer, IconButton } from "talisman-ui"

import { TALISMAN_QUEST_APP_URL, TALISMAN_WEB_APP_SWAP_URL } from "@extension/shared"
import { Nav, NavItem } from "@talisman/components/Nav"
import { TalismanWhiteLogo } from "@talisman/theme/logos"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"
import { useMnemonicBackup } from "@ui/hooks/useMnemonicBackup"
import { usePopupNavOpenClose } from "@ui/hooks/usePopupNavOpenClose"
import { useAccounts, useFeatureFlag } from "@ui/state"
import { IS_EMBEDDED_POPUP } from "@ui/util/constants"

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

  const handleSwapClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Swap button",
    })
    window.open(TALISMAN_WEB_APP_SWAP_URL, "_blank")
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

  const handleManageNetworksClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Manage Networks button",
    })
    api.dashboardOpen("/settings/networks-tokens/networks/ethereum")
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

  const showQuestLink = useFeatureFlag("QUEST_LINK")
  const handleQuestsClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Quests" })
    window.open(TALISMAN_QUEST_APP_URL, "_blank")
    if (IS_EMBEDDED_POPUP) window.close()
  }, [])

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
                <ExternalLinkIcon />
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
            {showQuestLink && (
              <NavItem
                className="hover:bg-primary/10"
                icon={
                  <div className="bg-primary flex h-[1em] w-[1em] items-center justify-center rounded-full">
                    <QuestStarIcon className="text-xs text-black" />
                  </div>
                }
                onClick={handleQuestsClick}
              >
                <span className="text-primary font-bold">{t("Quests")}</span>
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
