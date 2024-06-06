import {
  QUEST_APP_URL,
  TALISMAN_WEB_APP_STAKING_URL,
  TALISMAN_WEB_APP_SWAP_URL,
} from "@extension/shared"
import { Nav, NavItem } from "@talisman/components/Nav"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { FullColorSmallLogo } from "@talisman/theme/logos"
import {
  AlertCircleIcon,
  ExternalLinkIcon,
  KeyIcon,
  LockIcon,
  PlusIcon,
  QuestStarIcon,
  RepeatIcon,
  SendIcon,
  SettingsIcon,
  UsersIcon,
  XIcon,
  ZapIcon,
} from "@talismn/icons"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { usePopupNavOpenClose } from "@ui/hooks/usePopupNavOpenClose"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, IconButton } from "talisman-ui"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Navigation",
  featureVersion: 3,
  page: "Portfolio",
}

export const NavigationDrawer: FC = () => {
  const { t } = useTranslation()
  const { isOpen, close } = usePopupNavOpenClose()
  const hasAccounts = useHasAccounts()

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

  const handleStakingClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Staking button",
    })
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
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

  const handleQuestsClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Quests" })
    window.open(QUEST_APP_URL, "_blank")
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
            {hasAccounts && (
              <NavItem icon={<SendIcon />} onClick={handleSendFundsClick}>
                {t("Send Funds")}
              </NavItem>
            )}
            <NavItem icon={<UsersIcon />} onClick={handleAddressBookClick}>
              {t("Address Book")}
            </NavItem>
            <NavItem icon={<ZapIcon />} onClick={handleStakingClick}>
              <span className="flex items-center gap-2">
                {t("Staking")}
                <ExternalLinkIcon />
              </span>
            </NavItem>
            <NavItem icon={<RepeatIcon />} onClick={handleSwapClick}>
              <span className="flex items-center gap-2">
                {t("Swap")}
                <ExternalLinkIcon />
              </span>
            </NavItem>
            <NavItem icon={<KeyIcon />} onClick={handleBackupClick}>
              <span className="flex items-center">
                {t("Backup Wallet")}
                {!allBackedUp && <AlertCircleIcon className="text-primary ml-2 inline text-sm" />}
              </span>
            </NavItem>
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
