import { DiamondIcon, XIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { useAppState } from "@ui/hooks/useAppState"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

export const AssetDiscoveryPopupAlert = () => {
  const [showAssetDiscoveryAlert, setShowAssetDiscoveryAlert] =
    useAppState("showAssetDiscoveryAlert")
  const { t } = useTranslation()

  const handleGoToClick = useCallback(async () => {
    await api.dashboardOpen("/settings/asset-discovery")
    window.close()
  }, [])

  const handleCloseClick = useCallback(() => {
    setShowAssetDiscoveryAlert(false)
  }, [setShowAssetDiscoveryAlert])

  if (!showAssetDiscoveryAlert) return null

  return (
    <div className="bg-grey-800 flex h-16 w-full shrink-0 items-center gap-4 px-12 text-base">
      <DiamondIcon className="text-primary" />
      <div className="grow text-xs">
        <span>{t("New tokens detected.")}</span>
        <button type="button" className="ml-2 inline underline" onClick={handleGoToClick}>
          {t("Review")}
        </button>
      </div>
      <IconButton className="p-4" onClick={handleCloseClick}>
        <XIcon className="text-base" />
      </IconButton>
    </div>
  )
}
