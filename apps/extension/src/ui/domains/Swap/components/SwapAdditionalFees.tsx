import { InfoIcon } from "@talismn/icons"
import { Skeleton } from "@ui/components/Skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useToken } from "@ui/state/chaindata"
import BigNumber from "bignumber.js"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { QuoteFee } from "../swap-modules/common.swap-module"

const getAdditionalFees = (fees: QuoteFee[]) => fees.filter((fee) => fee.additional)

export const SwapAdditionalFees: FC<{ fees: QuoteFee[]; isLoading: boolean }> = ({
  fees,
  isLoading,
}) => (
  <>
    {getAdditionalFees(fees).map((fee) => (
      <AdditionalFeeRow key={`${fee.tokenId}-${fee.name}`} fee={fee} isLoading={isLoading} />
    ))}
  </>
)

const AdditionalFeeRow: FC<{ fee: QuoteFee; isLoading: boolean }> = ({ fee, isLoading }) => {
  const { t } = useTranslation()
  const token = useToken(fee.tokenId)
  const planck = token
    ? BigNumber(fee.amount).shiftedBy(token.decimals).integerValue(BigNumber.ROUND_CEIL).toFixed()
    : null

  return (
    <div className="flex h-11 items-center justify-between gap-8">
      <div className="whitespace-nowrap text-body-secondary text-xs">
        {t("Additional Fee")}
        <Tooltip placement="top">
          <TooltipTrigger asChild>
            <span className="ml-2">
              <InfoIcon className="inline align-text-top" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{fee.name}</TooltipContent>
        </Tooltip>
      </div>
      {isLoading ? (
        <Skeleton className="text-xs">0.0000 TKN ($0.00)</Skeleton>
      ) : planck ? (
        <TokensAndFiat
          className="text-body-secondary text-xs"
          tokensClassName="text-body"
          fiatClassName="text-body-secondary"
          tokenId={fee.tokenId}
          planck={planck}
        />
      ) : (
        <div className="text-body-secondary text-xs">{t("Unknown token")}</div>
      )}
    </div>
  )
}
