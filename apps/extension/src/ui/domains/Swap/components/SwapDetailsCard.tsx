import { ClockIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import BigNumber from "bignumber.js"
import { intervalToDuration } from "date-fns"
import { useAtomValue, useSetAtom } from "jotai"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { useSelectedCurrency, useTokenRatesMap } from "@ui/state"

import { useFiatValueForAmount } from "../hooks/useFiatValueForAmount"
import {
  BaseQuote,
  fromAmountAtom,
  fromAssetAtom,
  selectedProtocolAtom,
  selectedSubProtocolAtom,
  toAssetAtom,
} from "../swap-modules/common.swap-module"
import { Decimal } from "../swaps-port/Decimal"
import { SwapDetailsContainer } from "./SwapDetailsContainer"

export const SwapDetailsCard = ({
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

  const setSelectedProtocol = useSetAtom(selectedProtocolAtom)
  const setSelectedSubProtocol = useSetAtom(selectedSubProtocolAtom)

  const toAsset = useAtomValue(toAssetAtom)
  const fromAsset = useAtomValue(fromAssetAtom)
  const tokenRates = useTokenRatesMap()
  const currency = useSelectedCurrency()
  const fromAmount = useAtomValue(fromAmountAtom)

  const amount = useMemo(() => {
    if (!toAsset) return
    return Decimal.fromPlanck(amountOverride ?? quote.outputAmountBN, toAsset.decimals, {
      currency: toAsset.symbol,
    })
  }, [amountOverride, quote.outputAmountBN, toAsset])
  const fiatValue = useFiatValueForAmount({ amount, asset: toAsset, usdOverride })

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
          return acc.plus(fee.amount.times(rate))
        }, BigNumber(0))
        .toNumber()
        .toLocaleString(undefined, { style: "currency", currency, maximumSignificantDigits: 2 }),
    [currency, quote.fees, tokenRates],
  )

  if (!toAsset) return null

  return (
    <SwapDetailsContainer
      className={classNames(
        "bg-grey-900 hover:bg-grey-800 border-grey-900 cursor-pointer border",
        selected && "border-body-secondary",
      )}
      onClick={() => {
        setSelectedProtocol(quote.protocol)
        setSelectedSubProtocol(quote.subProtocol)
      }}
    >
      <div className="flex w-full items-start justify-between">
        <div className="flex flex-col">
          <div className="truncate text-sm font-bold">
            {amount?.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </div>
          <p className="text-body-secondary text-xs">
            {(fiatValue ?? 0)?.toLocaleString(undefined, { style: "currency", currency })}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <img src={quote.providerLogo} alt="" className="mb-1 h-10 rounded-full" />
          <p className="max-w-60 truncate text-xs font-semibold">{quote.providerName}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 border-t border-t-[#3f3f3f] pt-4 text-xs">
        <div className="flex items-center gap-5">
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
            <span className="text-body-secondary">{t("Fees")}</span>{" "}
            <span className="text-white">~{totalFee}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ClockIcon className="text-body-secondary h-7 w-7" />
          <div>{time}</div>
        </div>
      </div>
    </SwapDetailsContainer>
  )
}
