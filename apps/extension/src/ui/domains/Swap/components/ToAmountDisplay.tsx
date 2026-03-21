import { BalanceFormatter } from "@talismn/balances"
import { cn } from "@talismn/util"
import { Skeleton } from "@ui/components/Skeleton"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state/chaindata"
import { useTokenRates } from "@ui/state/tokenRates"
import { useMemo } from "react"
import { useSwap } from "../SwapProvider"

export const ToAmountDisplay = () => {
  const { toAmount, toTokenId, isQuoteDataCurrent, isAllQuotesSettled } = useSwap()
  const toToken = useToken(toTokenId ?? undefined)
  const tokenRates = useTokenRates(toTokenId)

  const formatter = useMemo(() => {
    if (!toToken) return null
    return new BalanceFormatter(toAmount ?? 0n, toToken.decimals, tokenRates)
  }, [toAmount, toToken, tokenRates])

  // Input changed — show skeleton placeholder while waiting for new quote
  if (!isQuoteDataCurrent)
    return (
      <div className="flex flex-col items-end gap-2">
        <Skeleton>{toToken ? `0 ${toToken.symbol}` : "0"}</Skeleton>
        <Skeleton className="text-xs">$0.00</Skeleton>
      </div>
    )

  const isRefreshing = isAllQuotesSettled === false && !!toAmount

  if (!toAmount || !toToken || !formatter)
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="text-body-secondary">{toToken ? `0 ${toToken.symbol}` : "0"}</div>
        {formatter ? (
          <Fiat amount={formatter} className="text-body-secondary text-xs" />
        ) : (
          <div aria-hidden="true" className="invisible text-body-secondary text-xs">
            0
          </div>
        )}
      </div>
    )

  return (
    <div className={cn("flex flex-col items-end gap-2", isRefreshing && "animate-pulse")}>
      <Tokens amount={formatter.tokens} decimals={toToken.decimals} symbol={toToken.symbol} />
      <Fiat amount={formatter} className="text-body-secondary text-xs" />
    </div>
  )
}
