import { useCallback } from "react"

import {
  useAppState,
  useAssetDiscoveryScan,
  useAssetDiscoveryScanProgress,
  useIsLoggedIn,
} from "@ui/state"

export const useAssetDiscoveryAlert = () => {
  const isLoggedIn = useIsLoggedIn()
  const [showAssetDiscoveryAlert, setShowAssetDiscoveryAlert] =
    useAppState("showAssetDiscoveryAlert")
  const [, setDismissedAssetDiscoveryAlertScanId] = useAppState(
    "dismissedAssetDiscoveryAlertScanId",
  )
  const { currentScanId } = useAssetDiscoveryScan()
  const { isInProgress, percent, balances } = useAssetDiscoveryScanProgress()

  const dismissAlert = useCallback(() => {
    setShowAssetDiscoveryAlert(false)
    setDismissedAssetDiscoveryAlertScanId(currentScanId ?? "")
  }, [currentScanId, setDismissedAssetDiscoveryAlertScanId, setShowAssetDiscoveryAlert])

  return {
    showAlert: showAssetDiscoveryAlert && isLoggedIn,
    dismissAlert,
    isInProgress,
    percent,
    hasDetectedNewTokens: !!balances.length,
  }
}
