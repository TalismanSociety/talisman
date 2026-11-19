import { IS_FIREFOX } from "@common/constants"
import { isAccountOwned } from "@core/domains/keyring/exports"
import { api } from "@ui/api"
import { useHelpAndSupportDrawerOpenClose } from "@ui/apps/popup/components/Navigation/HelpAndSupportDrawer"
import { useQuickSettingsOpenClose } from "@ui/apps/popup/components/Navigation/QuickSettings"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useRampsModal } from "@ui/domains/Ramps/useRampsModal"
import { useBittensorBondModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondModal"
import { useSwapModal } from "@ui/domains/Swap/hooks/useSwapModal"
import {
  useDefaultTaoDashboardNetworkId,
  useIsBittensorEnabled,
} from "@ui/domains/TaoDashboard/hooks/useIsBittensorEnabled"
import { getTaoDashboardUrl } from "@ui/domains/TaoDashboard/shared/util"
import { useMnemonicsAllBackedUp } from "@ui/hooks/useMnemonicsAllBackedUp"
import { useOpenFullscreen } from "@ui/hooks/useOpenFullscreen"
import { BITTENSOR_NETWORK_ID } from "@ui/state/bittensor"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { closeIfEmbeddedPopup } from "@ui/util/closeIfEmbeddedPopup"
import { IS_POPUP } from "@ui/util/constants"
import { getIsLedgerCapable } from "@ui/util/getIsLedgerCapable"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  type AModeLinkEntry,
  type AModeRouteEntry,
  buildAModeShortcuts,
} from "./aModeShortcutTable"
import type { AModeShortcut, AModeShortcuts } from "./types"

export const useAModeShortcuts = (): AModeShortcuts => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { selectedAccounts, selectedAccount } = usePortfolioNavigation()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { open: openSwapModal } = useSwapModal()
  const { open: openRampsModal } = useRampsModal()
  const { open: openBondModal } = useBittensorBondModal()
  const { open: openHelpAndSupport } = useHelpAndSupportDrawerOpenClose()
  const { open: openQuickSettings } = useQuickSettingsOpenClose()
  const openFullscreen = useOpenFullscreen()
  const canBuy = useFeatureFlag("BUY_CRYPTO")
  const isBittensorEnabled = useIsBittensorEnabled()
  const taoDashboardNetworkId = useDefaultTaoDashboardNetworkId()
  const allBackedUp = useMnemonicsAllBackedUp()

  const hasOwned = selectedAccounts.some(isAccountOwned)
  const isWatchedSelected = !!selectedAccount && !isAccountOwned(selectedAccount)
  const selectedAddress = selectedAccount?.address
  const hasSelectedAccounts = selectedAccounts.length > 0

  return useMemo(() => {
    const route = ({ dashboardPath, popupPath, ...entry }: AModeRouteEntry): AModeShortcut => ({
      ...entry,
      onClick: () => {
        if (!IS_POPUP) navigate(dashboardPath)
        else if (popupPath) navigate(popupPath)
        else {
          api.dashboardOpen(dashboardPath)
          closeIfEmbeddedPopup()
        }
      },
    })

    const link = ({ url, ...entry }: AModeLinkEntry): AModeShortcut => ({
      ...entry,
      onClick: () => window.open(url, "_blank"),
    })

    const bittensorNetworkId = taoDashboardNetworkId ?? BITTENSOR_NETWORK_ID

    return buildAModeShortcuts({
      t,
      isPopup: IS_POPUP,
      route,
      link,
      fundsDisabledReason:
        isWatchedSelected || !hasOwned
          ? t("Cannot send or receive funds on accounts that you don't own")
          : undefined,
      isWatchedSelected,
      hasSelectedAccounts,
      canBuy,
      isBittensorEnabled,
      taoDashboardPath: getTaoDashboardUrl(bittensorNetworkId),
      allBackedUp,
      isLedgerCapable: getIsLedgerCapable(),
      isFirefox: IS_FIREFOX,
      actions: {
        send: () => {
          const opened = api.sendFundsOpen({ entry: "a_mode", from: selectedAddress })
          if (IS_POPUP) opened.then(() => window.close())
        },
        receive: () => openCopyAddressModal({ entry: "a_mode", address: selectedAddress }),
        swap: () => openSwapModal({ entry: "a_mode" }),
        buy: () => openRampsModal({ entry: "a_mode" }),
        stakeTao: () =>
          openBondModal({ entry: "a_mode", networkId: bittensorNetworkId, stakeDirection: "bond" }),
        helpSupport: openHelpAndSupport,
        lock: () => {
          api.lock()
          window.close()
        },
        fullscreen: openFullscreen,
        quickSettings: openQuickSettings,
      },
    })
  }, [
    t,
    navigate,
    hasOwned,
    isWatchedSelected,
    hasSelectedAccounts,
    selectedAddress,
    openCopyAddressModal,
    openSwapModal,
    openRampsModal,
    openBondModal,
    openHelpAndSupport,
    openQuickSettings,
    openFullscreen,
    canBuy,
    isBittensorEnabled,
    taoDashboardNetworkId,
    allBackedUp,
  ])
}
