import { assetDiscoveryScanProgress, assetDiscoveryScanState } from "@ui/atoms"
import { useAppState } from "@ui/hooks/useAppState"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useCallback } from "react"
import { useRecoilValue } from "recoil"

export const useAssetDiscoveryAlert = () => {
  const isLoggedIn = useIsLoggedIn()
  const [showAssetDiscoveryAlert, setShowAssetDiscoveryAlert] =
    useAppState("showAssetDiscoveryAlert")
  const [, setDismissedAssetDiscoveryAlertScanId] = useAppState(
    "dismissedAssetDiscoveryAlertScanId"
  )
  const { currentScanId } = useRecoilValue(assetDiscoveryScanState)
  const { isInProgress, percent, balances } = useRecoilValue(assetDiscoveryScanProgress)

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
