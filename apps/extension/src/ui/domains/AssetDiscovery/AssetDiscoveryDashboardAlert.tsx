import { DiamondIcon, XIcon } from "@talismn/icons"
import { useAppState } from "@ui/hooks/useAppState"
import { MouseEventHandler, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { IconButton } from "talisman-ui"

const ASSET_DISCOVERY_TOAST_ID = "asset-discovery-toast"

const AssetDiscoveryToast = () => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full items-center gap-8 overflow-hidden py-2">
      <DiamondIcon className="text-primary shrink-0 text-lg" />
      <div className="grow space-y-2">
        <div className="text-body font-bold">{t("New tokens detected")}</div>
        <div className="text-body-secondary text-sm">{t("Click here to review")}</div>
      </div>
    </div>
  )
}

const CloseButton = () => {
  const [, setShowAssetDiscoveryAlert] = useAppState("showAssetDiscoveryAlert")

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation()
      toast.dismiss("asset-discovery-toast")
      setShowAssetDiscoveryAlert(false)
    },
    [setShowAssetDiscoveryAlert]
  )

  return (
    <IconButton onClick={handleClick}>
      <XIcon className="text-lg" />
    </IconButton>
  )
}

export const AssetDiscoveryDashboardAlert = () => {
  const [showAssetDiscoveryAlert] = useAppState("showAssetDiscoveryAlert")
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname === "/settings/asset-discovery") {
      toast.dismiss(ASSET_DISCOVERY_TOAST_ID)
      return
    }

    if (showAssetDiscoveryAlert && !toast.isActive(ASSET_DISCOVERY_TOAST_ID)) {
      toast(() => <AssetDiscoveryToast />, {
        autoClose: false,
        toastId: ASSET_DISCOVERY_TOAST_ID,
        onClick: () => {
          navigate("/settings/asset-discovery")
        },
        closeButton: () => <CloseButton />,
      })
    }
  }, [location, navigate, showAssetDiscoveryAlert, t])

  return null
}
