import { ChevronLeftIcon } from "@talismn/icons"
import { FC, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { PopupYieldPosition as PopupYieldPositionDetails } from "@ui/domains/Earn/components/PopupYieldPosition"
import { useYieldPosition } from "@ui/domains/Earn/hooks/useYieldPosition"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PopupYieldPosition = () => {
  const { popupOpenEvent } = useAnalytics()
  const { yieldId } = useParams()

  useEffect(() => {
    popupOpenEvent("earn yield position")
  }, [popupOpenEvent])

  return (
    <>
      <YieldPositionHeader yieldId={yieldId} />
      <div className="h-4 shrink-0"></div>
      <PopupYieldPositionDetails yieldId={yieldId} />
    </>
  )
}

const YieldPositionHeader: FC<{ yieldId: string | undefined }> = ({ yieldId }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const position = useYieldPosition(yieldId)

  if (!position) return null

  const totalValue = position.totalAmountUsd

  return (
    <div className="flex h-[4.4rem] w-full items-center gap-8">
      <div className="flex h-full grow items-center gap-4 overflow-hidden">
        <IconButton onClick={() => navigate(-1)}>
          <ChevronLeftIcon />
        </IconButton>
        <AssetLogo
          url={
            position.validators?.[0]?.logoURI ||
            position.product?.metadata.logoURI ||
            position.primaryToken.logoURI
          }
          className="size-[3.6rem]"
        />
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="text-body truncate text-sm font-bold">
            {position.validators?.[0]?.name || position.product?.metadata.name || "Yield Position"}
          </div>
          <div className="text-body-secondary truncate text-xs">
            <PortfolioAccount address={position.address} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 text-right">
          <div className="text-body-secondary text-sm">{t("Total")}</div>
          <div className="text-body text-base font-bold">
            <FiatFromUsd amount={totalValue} isBalance />
          </div>
        </div>
      </div>
    </div>
  )
}
