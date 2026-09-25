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

const toPlanck = (fee: QuoteFee, decimals: number) =>
  BigNumber(fee.amount).shiftedBy(decimals).integerValue(BigNumber.ROUND_CEIL).toFixed()

/** Sum of the additional fees charged in `tokenId`, the amount the account must hold on top of gas */
export const getAdditionalFeePlanck = (fees: QuoteFee[], tokenId: string, decimals: number) =>
  getAdditionalFees(fees)
    .filter((fee) => fee.tokenId === tokenId)
    .reduce((total, fee) => total + BigInt(toPlanck(fee, decimals)), 0n)

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
  const planck = token ? toPlanck(fee, token.decimals) : null

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
