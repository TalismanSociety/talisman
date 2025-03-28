import { ClockIcon } from "@talismn/icons"
import { intervalToDuration } from "date-fns"
import { useAtomValue } from "jotai"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { useSelectedCurrency, useTokenRatesMap } from "@ui/state"

import {
  BaseQuote,
  fromAmountAtom,
  fromAssetAtom,
  toAssetAtom,
} from "../swap-modules/common.swap-module"
import { Decimal } from "../swaps-port/Decimal"

type Props = {
  quote: BaseQuote
  amountOverride?: bigint
}

export const SwapDetailsCard: FC<Props & { selected?: boolean }> = ({ amountOverride, quote }) => {
  const { t } = useTranslation()

  const toAsset = useAtomValue(toAssetAtom)
  const fromAsset = useAtomValue(fromAssetAtom)
  const tokenRates = useTokenRatesMap()
  const currency = useSelectedCurrency()
  const fromAmount = useAtomValue(fromAmountAtom)

  const amount = useMemo(() => {
    if (!toAsset) return null
    return Decimal.fromPlanck(amountOverride ?? quote.outputAmountBN, toAsset.decimals, {
      currency: toAsset.symbol,
    })
  }, [amountOverride, quote.outputAmountBN, toAsset])

  const time = useMemo(() => {
    const duration = intervalToDuration({ start: 0, end: quote.timeInSec * 1000 })
    const parts: string[] = []
    if (duration.minutes && duration.minutes > 0) parts.push(`${duration.minutes}m`)
    if (duration.seconds && duration.seconds > 0) parts.push(`${duration.seconds}s`)
    return parts.join(" ")
  }, [quote.timeInSec])

  const toQuote = useMemo(() => {
    if (!amount || !fromAmount) return undefined
    return amount.mapNumber(() => {
      const res = (amount.toNumber() ?? 0) / (fromAmount.toNumber() ?? 1)
      if (res < 0.0001) return 0
      return res
    })
  }, [fromAmount, amount])

  const totalFee = useMemo(
    () =>
      quote.fees
        .reduce((acc, fee) => {
          const rate = tokenRates[fee.tokenId]?.[currency]?.price ?? 0
          return acc + fee.amount.toNumber() * rate
        }, 0)
        .toLocaleString(undefined, { style: "currency", currency, maximumSignificantDigits: 2 }),
    [currency, quote.fees, tokenRates],
  )

  if (!toAsset) return null

  return (
    <div>
      <div className="flex w-full items-center justify-between">
        <div>{t("Provider")}</div>
        <div className="flex items-center justify-end gap-4">
          <img src={quote.providerLogo} alt="" className="mb-1 h-10 rounded-full" />
          <p className="max-w-60 truncate text-xs font-semibold">{quote.providerName}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4 border-t border-t-[#3f3f3f] pt-4 text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="whitespace-pre">1 {fromAsset?.symbol}</span> <span>=</span>{" "}
            <span className="whitespace-pre">
              <Tokens
                amount={toQuote?.toString()}
                symbol={toQuote?.currency}
                decimals={toQuote?.decimals}
                noCountUp
              />
            </span>
          </div>
          <div className="text-muted-foreground">
            <span className="text-body-inactive">{t("Fees")}</span>{" "}
            <span className="text-white">~{totalFee}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ClockIcon className="text-body-inactive h-7 w-7" />
          <div>{time}</div>
        </div>
      </div>
    </div>
  )
}
