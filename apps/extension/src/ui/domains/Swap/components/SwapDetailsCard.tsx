import { ClockIcon } from "@talismn/icons"
import { classNames, planckToTokens } from "@talismn/util"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import BigNumber from "bignumber.js"
import { intervalToDuration } from "date-fns"
import { memo, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useFiatValueForAmount } from "../hooks/useFiatValueForAmount"
import { useSwap } from "../SwapProvider"
import type { BaseQuote } from "../swap-modules/common.swap-module"
import { SwapDetailsContainer } from "./SwapDetailsContainer"

export const SwapDetailsCard = memo(
  ({
    quote,
    selected,
    amountOverride,
    usdOverride,
  }: {
    quote: BaseQuote
    selected?: boolean
    amountOverride?: bigint
    usdOverride?: number
  }) => {
    const { t } = useTranslation()

    const { setSelectedProtocol, setSelectedSubProtocol, toAsset, fromAsset, fromAmount } =
      useSwap()
    const tokenRates = useTokenRatesMap()
    const currency = useSelectedCurrency()

    const amount = useMemo(() => {
      return amountOverride ?? quote.outputAmountBN
    }, [amountOverride, quote.outputAmountBN])
    const fiatValue = useFiatValueForAmount({ planck: amount, asset: toAsset, usdOverride })

    const time = useMemo(() => {
      const duration = intervalToDuration({ start: 0, end: quote.timeInSec * 1000 })
      const parts: string[] = []
      if (duration.minutes && duration.minutes > 0) parts.push(`${duration.minutes}m`)
      if (duration.seconds && duration.seconds > 0) parts.push(`${duration.seconds}s`)
      return parts.join(" ")
    }, [quote.timeInSec])

    const toQuote = useMemo(() => {
      if (!amount || !fromAmount || !toAsset || !fromAsset) return undefined
      const toNum = Number(planckToTokens(amount.toString(), toAsset.decimals) ?? "0")
      const fromNum = Number(planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "1")
      const res = toNum / (fromNum || 1)
      if (res < 0.0001) return "0"
      return res.toString()
    }, [fromAmount, fromAsset, amount, toAsset])

    const totalFee = useMemo(
      () =>
        quote.fees
          .reduce((acc, fee) => {
            const rate = tokenRates[fee.tokenId]?.[currency]?.price ?? 0
            return acc.plus(fee.amount.times(rate))
          }, BigNumber(0))
          .toNumber()
          .toLocaleString(undefined, { style: "currency", currency, maximumSignificantDigits: 2 }),
      [currency, quote.fees, tokenRates]
    )

    if (!toAsset) return null

    return (
      <SwapDetailsContainer
        className={classNames(
          "cursor-pointer border border-grey-900 bg-grey-900 hover:bg-grey-800",
          selected && "border-body-secondary"
        )}
        onClick={() => {
          setSelectedProtocol(quote.protocol)
          setSelectedSubProtocol(quote.subProtocol)
        }}
      >
        <div className="flex w-full items-start justify-between">
          <div className="flex flex-col">
            <div className="truncate font-bold text-sm">
              {toAsset
                ? `${parseFloat(
                    planckToTokens(amount.toString(), toAsset.decimals) ?? "0"
                  ).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toAsset.symbol}`
                : null}
            </div>
            <p className="text-body-secondary text-xs">
              {(fiatValue ?? 0)?.toLocaleString(undefined, { style: "currency", currency })}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3">
            <img src={quote.providerLogo} alt="" className="mb-1 h-10 rounded-full" />
            <p className="max-w-60 truncate font-semibold text-xs">{quote.providerName}</p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-4 border-t border-t-[#3f3f3f] pt-4 text-xs">
          <div className="flex items-center gap-5">
            <div>
              <span className="whitespace-pre">1 {fromAsset?.symbol}</span> <span>=</span>{" "}
              <span className="whitespace-pre">
                <Tokens amount={toQuote} symbol={toAsset?.symbol} noCountUp />
              </span>
            </div>
            <div className="text-muted-foreground">
              <span className="text-body-secondary">{t("Fees")}</span>{" "}
              <span className="text-white">~{totalFee}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ClockIcon className="h-7 w-7 text-body-secondary" />
            <div>{time}</div>
          </div>
        </div>
      </SwapDetailsContainer>
    )
  }
)
