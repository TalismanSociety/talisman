import { InfoIcon } from "@talismn/icons"
import { Skeleton } from "@ui/components/Skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useToken } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import BigNumber from "bignumber.js"
import type { ComponentProps, FC } from "react"
import { useTranslation } from "react-i18next"
import { type QuoteFee, TALISMAN_FEE_NAME } from "../swap-modules/common.swap-module"

const getAdditionalFees = (fees: QuoteFee[]) => fees.filter((fee) => fee.additional)

const isTalismanFee = (fee: QuoteFee) => fee.name === TALISMAN_FEE_NAME && fee.amount.gt(0)

const getOtherFees = (fees: QuoteFee[]) =>
  fees.filter((fee) => fee.additional || isTalismanFee(fee))

const toPlanck = (fee: QuoteFee, decimals: number) =>
  BigNumber(fee.amount).shiftedBy(decimals).integerValue(BigNumber.ROUND_CEIL).toFixed()

/** Sum of the additional fees charged in `tokenId`, the amount the account must hold on top of gas */
export const getAdditionalFeePlanck = (fees: QuoteFee[], tokenId: string, decimals: number) =>
  getAdditionalFees(fees)
    .filter((fee) => fee.tokenId === tokenId)
    .reduce((total, fee) => total + BigInt(toPlanck(fee, decimals)), 0n)

export const SwapOtherFees: FC<{ fees: QuoteFee[]; isLoading: boolean }> = ({
  fees,
  isLoading,
}) => {
  const { t } = useTranslation()
  const otherFees = getOtherFees(fees)
  if (!otherFees.length) return null

  return (
    <div className="flex h-11 items-center justify-between gap-8">
      <div className="whitespace-nowrap text-body-secondary text-xs">
        {t("Other Fees")}
        <Tooltip placement="top">
          <TooltipTrigger asChild>
            <span className="ml-2">
              <InfoIcon className="inline align-text-top" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <OtherFeesBreakdown fees={otherFees} />
          </TooltipContent>
        </Tooltip>
      </div>
      {isLoading ? (
        <Skeleton className="text-xs">0.0000 TKN ($0.00)</Skeleton>
      ) : (
        <OtherFeesTotal fees={otherFees} />
      )}
    </div>
  )
}

const OtherFeesBreakdown: FC<{ fees: QuoteFee[] }> = ({ fees }) => (
  <div className="flex flex-col gap-2 whitespace-nowrap text-sm">
    {fees.map((fee) => (
      <div key={`${fee.name}-${fee.tokenId}`} className="flex w-full justify-between gap-8">
        <div>{fee.name}:</div>
        <FeeAmount fee={fee} noTooltip noCountUp />
      </div>
    ))}
  </div>
)

const OtherFeesTotal: FC<{ fees: QuoteFee[] }> = ({ fees }) => {
  const [firstFee] = fees
  const isSingleToken = fees.every((fee) => fee.tokenId === firstFee?.tokenId)

  return firstFee && isSingleToken ? (
    <FeeAmount
      fee={{
        ...firstFee,
        amount: fees.reduce((total, fee) => total.plus(fee.amount), BigNumber(0)),
      }}
      className="text-body-secondary text-xs"
      tokensClassName="text-body"
      fiatClassName="text-body-secondary"
    />
  ) : (
    <FiatTotal fees={fees} />
  )
}

const FiatTotal: FC<{ fees: QuoteFee[] }> = ({ fees }) => {
  const tokenRates = useTokenRatesMap()
  const currency = useSelectedCurrency()
  const total = fees.reduce(
    (sum, fee) => sum.plus(fee.amount.times(tokenRates[fee.tokenId]?.[currency]?.price ?? 0)),
    BigNumber(0)
  )

  return <Fiat className="text-body text-xs" amount={total.toNumber()} noCountUp />
}

const FeeAmount: FC<
  { fee: QuoteFee } & Omit<ComponentProps<typeof TokensAndFiat>, "tokenId" | "planck">
> = ({ fee, ...props }) => {
  const { t } = useTranslation()
  const token = useToken(fee.tokenId)

  return token ? (
    <TokensAndFiat {...props} tokenId={fee.tokenId} planck={toPlanck(fee, token.decimals)} />
  ) : (
    <div className="text-body-secondary text-xs">{t("Unknown token")}</div>
  )
}
