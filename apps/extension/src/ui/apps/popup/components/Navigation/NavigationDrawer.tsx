import { Nav, NavItemButton } from "@talisman/components/Nav"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import {
  CreditCardIcon,
  DownloadAlertIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  PaperPlaneIcon,
  PlusIcon,
  SettingsIcon,
  XIcon,
} from "@talisman/theme/icons"
import { FullColorSmallLogo } from "@talisman/theme/logos"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useNavigationContext } from "@ui/apps/popup/context/NavigationContext"
import { BuildVersionPill } from "@ui/domains/Build/BuildVersionPill"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSetting } from "@ui/hooks/useSettings"
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
  const { isOpen, close } = useNavigationContext()
  const showBuyTokens = useIsFeatureEnabled("BUY_CRYPTO")

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

  const handleSendFundsClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Send Funds button",
    })
    await api.sendFundsOpen()
    window.close()
  }, [])

  const handleBuyTokensClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Buy Crypto button",
    })
    await api.modalOpen({ modalType: "buy" })
    window.close()
  }, [])

  const handleSettingsClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Settings button",
    })
    api.dashboardOpen("/settings")
    window.close()
  }, [])

  const handleBackupClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Backup wallet button",
    })
    api.dashboardOpen("/settings?showBackupModal")
    window.close()
  }, [])

  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const toggleHideBalance = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Hide balances button",
    })
    setHideBalances((prev) => !prev)
    close()
  }, [close, setHideBalances])

  const { isNotConfirmed } = useMnemonicBackup()

  const { t } = useTranslation()

  return (
    <Drawer className="h-full" containerId="main" anchor="bottom" isOpen={isOpen} onDismiss={close}>
      <div className="flex h-full w-full flex-col bg-black">
        <header className="border-grey-800 box-border flex h-36 w-full items-center justify-between border-b px-12">
          <FullColorSmallLogo className="h-[2.5rem] w-auto" />
          <IconButton onClick={close} aria-label={t("Close menu")}>
            <XIcon />
          </IconButton>
        </header>
        <ScrollContainer className="flex-grow">
          <Nav className="p-4">
            <NavItemButton icon={<PaperPlaneIcon />} onClick={handleSendFundsClick}>
              {t("Send Funds")}
            </NavItemButton>
            {showBuyTokens && (
              <NavItemButton icon={<CreditCardIcon />} onClick={handleBuyTokensClick}>
                {t("Buy Crypto")}
              </NavItemButton>
            )}
            <NavItemButton
              icon={hideBalances ? <EyeIcon /> : <EyeOffIcon />}
              onClick={toggleHideBalance}
            >
              {hideBalances ? t("Show Balances") : t("Hide Balances")}
            </NavItemButton>
            <NavItemButton icon={<PlusIcon />} onClick={handleAddAccountClick}>
              {t("Add Account")}
            </NavItemButton>
            <NavItemButton icon={<SettingsIcon />} onClick={handleSettingsClick}>
              {t("Settings")}
            </NavItemButton>
            <NavItemButton
              icon={isNotConfirmed ? <DownloadAlertIcon /> : <DownloadIcon />}
              onClick={handleBackupClick}
            >
              {t("Backup Wallet")}
            </NavItemButton>
            <NavItemButton icon={<LockIcon />} onClick={handleLock}>
              {t("Lock Wallet")}
            </NavItemButton>
          </Nav>
        </ScrollContainer>
        <footer className="py-10 text-center">
          <BuildVersionPill />
        </footer>
      </div>
    </Drawer>
  )
}
