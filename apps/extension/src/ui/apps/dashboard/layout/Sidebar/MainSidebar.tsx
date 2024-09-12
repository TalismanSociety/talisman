import {
  CreditCardIcon,
  DownloadAlertIcon,
  PieChartIcon,
  PlusIcon,
  RepeatIcon,
  SettingsIcon,
  ZapIcon,
} from "@talismn/icons"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { TALISMAN_WEB_APP_STAKING_URL, TALISMAN_WEB_APP_SWAP_URL } from "@extension/shared"
import { Nav } from "@talisman/components/Nav"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/useBuyTokensModal"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useIsFeatureEnabled } from "@ui/hooks/useIsFeatureEnabled"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"

import { SidebarNavItem } from "./SidebarNavItem"

export const MainSidebar = () => {
  const { t } = useTranslation()

  const navigate = useNavigate()
  const { genericEvent } = useAnalytics()
  const showBuyCryptoButton = useIsFeatureEnabled("BUY_CRYPTO")
  const showStaking = useIsFeatureEnabled("LINK_STAKING")

  const { showBackupWarning } = useMnemonicBackup()

  const handlePortfolioClick = useCallback(() => {
    genericEvent("goto portfolio", { from: "sidebar" })
    navigate("/portfolio")
  }, [genericEvent, navigate])

  const handleAddAccountClick = useCallback(() => {
    genericEvent("goto add account", { from: "sidebar" })
    navigate("/accounts/add")
  }, [genericEvent, navigate])

  const handleStakingClick = useCallback(() => {
    genericEvent("open web app staking", { from: "sidebar", target: "staking" })
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
    return false
  }, [genericEvent])

  const handleSwapClick = useCallback(() => {
    genericEvent("open web app swap", { from: "sidebar" })
    window.open(TALISMAN_WEB_APP_SWAP_URL, "_blank")
    return false
  }, [genericEvent])

  const handleSettingsClick = useCallback(() => {
    genericEvent("goto settings", { from: "sidebar" })
    navigate("/settings/general")
  }, [genericEvent, navigate])

  const { open: openBuyModal } = useBuyTokensModal()
  const handleBuyClick = useCallback(() => {
    genericEvent("open buy tokens", { from: "sidebar" })
    openBuyModal()
  }, [genericEvent, openBuyModal])

  const handleBackupClick = useCallback(() => {
    genericEvent("goto backup modal", { from: "sidebar" })
    navigate("/settings/mnemonics?showBackupModal")
  }, [genericEvent, navigate])

  return (
    <Nav className="gap-1 p-4 text-sm lg:px-12 lg:pb-12 lg:pt-6 lg:text-base">
      <SidebarNavItem
        title={t("Add Account")}
        to="/accounts/add"
        onClick={handleAddAccountClick}
        icon={<PlusIcon />}
      />
      <SidebarNavItem
        title={t("Portfolio")}
        to="/portfolio"
        onClick={handlePortfolioClick}
        icon={<PieChartIcon />}
      />
      {showBuyCryptoButton && (
        <SidebarNavItem
          title={t("Buy Crypto")}
          onClick={handleBuyClick}
          icon={<CreditCardIcon />}
        />
      )}
      {showStaking && (
        <SidebarNavItem
          title={t("Staking")}
          onClick={handleStakingClick}
          isExternalLink
          icon={<ZapIcon />}
        />
      )}
      <SidebarNavItem
        title={t("Swap")}
        onClick={handleSwapClick}
        isExternalLink
        icon={<RepeatIcon />}
      />

      <SidebarNavItem
        title={t("Settings")}
        to="/settings/general"
        onClick={handleSettingsClick}
        icon={<SettingsIcon />}
      />
      {showBackupWarning && (
        <SidebarNavItem
          title={t("Backup Wallet")}
          // show only on large screens
          className="!hidden lg:!flex"
          onClick={handleBackupClick}
          icon={<DownloadAlertIcon />}
        />
      )}
    </Nav>
  )
}
