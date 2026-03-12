import { BalanceFormatter } from "@talismn/balances"
import { isNotNil } from "@talismn/util"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state/chaindata"
import { useTokenRates } from "@ui/state/tokenRates"
import { useMemo } from "react"
import { useSwap } from "../SwapProvider"

export const ToAmountDisplay = () => {
  const { toAmount, toTokenId } = useSwap()
  const toToken = useToken(toTokenId ?? undefined)
  const tokenRates = useTokenRates(toTokenId)

  const formatter = useMemo(() => {
    if (!isNotNil(toAmount) || !toToken) return null
    return new BalanceFormatter(toAmount, toToken.decimals, tokenRates)
  }, [toAmount, toToken, tokenRates])

  if (!toAmount || !toToken || !formatter) return null

  return (
    <div className="flex flex-col items-end gap-2">
      <Tokens amount={formatter.tokens} decimals={toToken.decimals} symbol={toToken.symbol} />
      <Fiat amount={formatter} className="text-body-secondary text-xs" />
    </div>
  )
}
