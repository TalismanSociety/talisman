import { BalanceFormatter } from "@talismn/balances"
import { Skeleton } from "@ui/components/Skeleton"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state/chaindata"
import { useTokenRates } from "@ui/state/tokenRates"
import { cn } from "@ui/util/cn"
import { useMemo } from "react"
import { useSwap } from "../SwapProvider"

export const ToAmountDisplay = () => {
  const { toAmount, toTokenId, isQuoteDataCurrent, isAllQuotesSettled } = useSwap()
  const toToken = useToken(toTokenId ?? undefined)
  const tokenRates = useTokenRates(toTokenId)

  const formatter = useMemo(() => {
    if (!toToken) return new BalanceFormatter(0n, 18)
    return new BalanceFormatter(toAmount ?? 0n, toToken.decimals, tokenRates)
  }, [toAmount, toToken, tokenRates])

  // Input changed — show skeleton placeholder while waiting for new quote
  if (!isQuoteDataCurrent)
    return (
      <div className="flex flex-col items-end">
        <div className="h-12">
          <Skeleton className="w-40 text-md">{toToken ? `0 ${toToken.symbol}` : "0"}</Skeleton>
        </div>
        <Skeleton className="text-xs">$0.00</Skeleton>
      </div>
    )

  const isRefreshing = isAllQuotesSettled === false && !!toAmount

  if (!toAmount || !toToken || !formatter)
    return (
      <div className="flex flex-col items-end">
        <div className="h-12">
          <div className="text-body-secondary text-md">{toToken ? `0 ${toToken.symbol}` : "0"}</div>
        </div>
        <Fiat amount={formatter} className="text-body-inactive text-xs" />
      </div>
    )

  return (
    <div className={cn("flex flex-col items-end", isRefreshing && "animate-pulse")}>
      <div className="h-12">
        <Tokens
          amount={formatter.tokens}
          decimals={toToken.decimals}
          symbol={toToken.symbol}
          className="text-md"
        />
      </div>
      <Fiat amount={formatter} className="text-body-inactive text-xs" />
    </div>
  )
}
