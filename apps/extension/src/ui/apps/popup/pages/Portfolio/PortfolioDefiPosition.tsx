import { ChevronLeftIcon } from "@talismn/icons"
import { FC, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { PopupDefiPosition } from "@ui/domains/Portfolio/DeFi/PopupDefiPosition"
import { PositionTotal } from "@ui/domains/Portfolio/DeFi/PositionTotal"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useDefiPosition } from "@ui/state"

export const PortfolioDefiPosition = () => {
  const { popupOpenEvent } = useAnalytics()
  const { positionId } = useParams()

  useEffect(() => {
    popupOpenEvent("portfolio Defi position")
  }, [popupOpenEvent])

  return (
    <>
      <DefiPositionHeader positionId={positionId} />
      <div className="h-4 shrink-0"></div>
      <PopupDefiPosition positionId={positionId} />
    </>
  )
}

const DefiPositionHeader: FC<{ positionId: string | undefined }> = ({ positionId }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const position = useDefiPosition(positionId)

  if (!position) return null

  return (
    <div className="flex h-[4.4rem] w-full items-center gap-8">
      <div className="flex h-full grow items-center gap-4 overflow-hidden">
        <IconButton onClick={() => navigate(-1)}>
          <ChevronLeftIcon />
        </IconButton>
        <AssetLogo url={position.defiLogoUrl} className="size-[3.6rem]" />
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="text-body truncate text-sm font-bold">{position.defiName}</div>
          <div className="text-body-secondary truncate text-xs">
            <PortfolioAccount address={position.address} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 text-right">
          <div className="text-body-secondary text-sm">{t("Total")}</div>
          <div className="text-body text-base font-bold">
            <PositionTotal position={position} />
          </div>
        </div>
      </div>
    </div>
  )
}
