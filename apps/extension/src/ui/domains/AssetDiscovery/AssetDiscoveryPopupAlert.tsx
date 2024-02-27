import { DiamondIcon, XIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { useAssetDiscoveryAlert } from "./useAssetDiscoveryAlert"

export const AssetDiscoveryPopupAlert = () => {
  const { showAlert, dismissAlert, isInProgress, percent, hasDetectedNewTokens } =
    useAssetDiscoveryAlert()
  const { t } = useTranslation()

  const handleGoToClick = useCallback(async () => {
    await api.dashboardOpen("/settings/networks-tokens/asset-discovery")
    window.close()
  }, [])

  if (!showAlert) return null

  return (
    <div className="bg-grey-800 flex h-16 w-full shrink-0 items-center gap-4 px-12 text-base">
      <DiamondIcon className="text-primary" />
      <div className="grow text-xs">
        <span>{hasDetectedNewTokens ? t("New tokens detected.") : t("Scanning for tokens.")}</span>
        <button
          type="button"
          className="ml-4 inline tabular-nums underline"
          onClick={handleGoToClick}
        >
          {isInProgress
            ? t(`Progress {{percent}}%`, { percent })
            : hasDetectedNewTokens
            ? t("Review")
            : null}
        </button>
      </div>
      <IconButton className="p-4" onClick={dismissAlert}>
        <XIcon className="text-base" />
      </IconButton>
    </div>
  )
}
