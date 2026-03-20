import { Skeleton } from "@ui/components/Skeleton"
import { useToken } from "@ui/state/chaindata"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import { formatSwapExchangeRate } from "../swap-utils"

export const QuoteExchangeRate = () => {
  const { t } = useTranslation()
  const { fromTokenId, toTokenId, fromAmount, selectedQuote } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)

  const [reversed, setReversed] = useState(false)
  const toggleReversed = useCallback(() => setReversed((r) => !r), [])

  const exchangeRate = useMemo(() => {
    if (!selectedQuote || !fromAmount || !fromToken || !toToken) return undefined
    return formatSwapExchangeRate({
      fromAmount,
      fromDecimals: fromToken.decimals,
      fromSymbol: fromToken.symbol,
      toDecimals: toToken.decimals,
      toSymbol: toToken.symbol,
      outputAmountBN: selectedQuote.outputAmountBN,
      reversed,
    })
  }, [selectedQuote, fromAmount, fromToken, toToken, reversed])

  const isLoading = !selectedQuote

  return (
    <div className="flex h-11 items-center justify-between gap-8">
      <div className="text-body-secondary text-xs">{t("Exchange Rate")}</div>
      <div className="text-body-secondary text-xs">
        {isLoading ? (
          <Skeleton>1 TKN = 0.0000 TKN</Skeleton>
        ) : exchangeRate !== undefined ? (
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1 text-body-secondary hover:text-body"
            onClick={toggleReversed}
          >
            {exchangeRate}
          </button>
        ) : null}
      </div>
    </div>
  )
}
