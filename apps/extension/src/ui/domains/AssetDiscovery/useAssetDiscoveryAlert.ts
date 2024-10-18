import { useAtomValue } from "jotai"
import { useCallback } from "react"

import { assetDiscoveryScanAtom, assetDiscoveryScanProgressAtom } from "@ui/atoms"
import { useAppState } from "@ui/hooks/useAppState"
import { useIsLoggedIn } from "@ui/state"

export const useAssetDiscoveryAlert = () => {
  const isLoggedIn = useIsLoggedIn()
  const [showAssetDiscoveryAlert, setShowAssetDiscoveryAlert] =
    useAppState("showAssetDiscoveryAlert")
  const [, setDismissedAssetDiscoveryAlertScanId] = useAppState(
    "dismissedAssetDiscoveryAlertScanId"
  )
  const { currentScanId } = useAtomValue(assetDiscoveryScanAtom)
  const { isInProgress, percent, balances } = useAtomValue(assetDiscoveryScanProgressAtom)

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
