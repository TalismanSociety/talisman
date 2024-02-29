import { DiamondIcon, XIcon } from "@talismn/icons"
import { MouseEventHandler, Suspense, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { IconButton } from "talisman-ui"

import { useAssetDiscoveryAlert } from "./useAssetDiscoveryAlert"

const ASSET_DISCOVERY_TOAST_ID = "asset-discovery-toast"

const AssetDiscoveryToast = () => {
  const { t } = useTranslation()

  const { isInProgress, percent, hasDetectedNewTokens } = useAssetDiscoveryAlert()

  return (
    <div className="flex w-full items-center gap-8 overflow-hidden py-2">
      <DiamondIcon className="text-primary shrink-0 text-lg" />
      <div className="grow space-y-2">
        <div className="text-body font-bold">
          {hasDetectedNewTokens ? t("New tokens detected") : t("Scanning for tokens")}
        </div>
        <div className="text-body-secondary text-sm tabular-nums">
          {isInProgress
            ? t("Scan in progress: {{percent}}%", { percent })
            : t("Click here to review")}
        </div>
      </div>
    </div>
  )
}

const CloseButton = () => {
  const { dismissAlert } = useAssetDiscoveryAlert()

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation()
      dismissAlert()
    },
    [dismissAlert]
  )

  return (
    <IconButton onClick={handleClick}>
      <XIcon className="text-lg" />
    </IconButton>
  )
}

export const AssetDiscoveryDashboardAlert = () => {
  const { showAlert } = useAssetDiscoveryAlert()
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!showAlert || location.pathname === "/settings/networks-tokens/asset-discovery") {
      toast.dismiss(ASSET_DISCOVERY_TOAST_ID)
      return
    }

    if (showAlert && !toast.isActive(ASSET_DISCOVERY_TOAST_ID)) {
      toast(
        () => (
          <Suspense>
            <AssetDiscoveryToast />
          </Suspense>
        ),
        {
          autoClose: false,
          toastId: ASSET_DISCOVERY_TOAST_ID,
          onClick: () => {
            navigate("/settings/networks-tokens/asset-discovery")
          },
          closeButton: () => (
            <Suspense>
              <CloseButton />
            </Suspense>
          ),
        }
      )
    }
  }, [location, navigate, showAlert, t])

  return null
}
