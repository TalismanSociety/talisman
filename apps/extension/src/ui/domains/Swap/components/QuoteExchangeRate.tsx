import { planckToTokens } from "@talismn/util"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state/chaindata"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useSwap } from "../SwapProvider"

export const QuoteExchangeRate = () => {
  const { t } = useTranslation()
  const { fromTokenId, toTokenId, fromAmount, selectedQuote } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)

  const exchangeRate = useMemo(() => {
    if (!selectedQuote || !fromAmount || !fromToken || !toToken) return undefined
    const toNum = Number(
      planckToTokens(selectedQuote.outputAmountBN.toString(), toToken.decimals) ?? "0"
    )
    const fromNum = Number(planckToTokens(fromAmount.toString(), fromToken.decimals) ?? "1")
    const res = toNum / (fromNum || 1)
    if (res < 0.0001) return "0"
    return res.toString()
  }, [selectedQuote, fromAmount, fromToken, toToken])

  const isLoading = !selectedQuote

  return (
    <div className="flex h-11 items-center justify-between gap-8">
      <div className="text-body-secondary text-xs">{t("Exchange Rate")}</div>
      <div className="text-body-secondary text-xs">
        {isLoading ? (
          <span
            aria-hidden="true"
            className="animate-pulse rounded-xs bg-body-disabled text-body-disabled"
          >
            1 TKN = 0.0000 TKN
          </span>
        ) : exchangeRate !== undefined && fromToken && toToken ? (
          <span>
            1 {fromToken.symbol} ={" "}
            <Tokens amount={exchangeRate} symbol={toToken.symbol} noCountUp />
          </span>
        ) : null}
      </div>
    </div>
  )
}
