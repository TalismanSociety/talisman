import { ChevronLeftIcon } from "@talismn/icons"
import { FC, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
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
  const [searchParams] = useSearchParams()

  useEffect(() => {
    popupOpenEvent("earn yield position")
  }, [popupOpenEvent])

  const accountAddress = searchParams.get("account")
  const validatorAddress = searchParams.get("validator")

  return (
    <>
      <YieldPositionHeader
        yieldId={yieldId}
        accountAddress={accountAddress}
        validatorAddress={validatorAddress}
      />
      <div className="h-4 shrink-0"></div>
      <PopupYieldPositionDetails
        yieldId={yieldId}
        accountAddress={accountAddress}
        validatorAddress={validatorAddress}
      />
    </>
  )
}

const YieldPositionHeader: FC<{
  yieldId: string | undefined
  accountAddress: string | null
  validatorAddress: string | null
}> = ({ yieldId, accountAddress, validatorAddress }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const position = useYieldPosition(yieldId, accountAddress, validatorAddress)

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
            (position.balances[0] as unknown as { validator?: { logoURI?: string } })?.validator
              ?.logoURI ||
            position.product?.metadata.logoURI ||
            position.balances[0]?.token.logoURI
          }
          className="size-[3.6rem]"
        />
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="text-body flex items-center gap-2 truncate text-sm font-bold">
            <span className="max-w-[14rem] truncate">{position.displayName}</span>
          </div>
          <div className="text-body-secondary truncate text-xs">
            <PortfolioAccount address={position.balances[0]?.address} />
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
