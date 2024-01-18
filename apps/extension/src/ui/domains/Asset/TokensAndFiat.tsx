import { BalanceFormatter } from "@talismn/balances"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, Suspense, useMemo } from "react"

import { Fiat } from "./Fiat"
import Tokens from "./Tokens"

type TokensAndFiatProps = {
  planck?: string | bigint
  tokenId?: string
  className?: string
  as?: "span" | "div"
  noTooltip?: boolean
  noCountUp?: boolean
  isBalance?: boolean
  noFiat?: boolean
}

const TokensAndFiatInner: FC<TokensAndFiatProps> = ({
  planck,
  tokenId,
  className,
  noTooltip,
  noCountUp,
  isBalance,
  noFiat,
}) => {
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)

  const balance = useMemo(
    () =>
      token && planck !== undefined
        ? new BalanceFormatter(planck, token.decimals, tokenRates)
        : null,
    [planck, token, tokenRates]
  )
  const currency = useSelectedCurrency()

  if (!balance || !token) return null

  return (
    <span className={className}>
      <Tokens
        amount={balance.tokens}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp={noCountUp}
        noTooltip={noTooltip}
        isBalance={isBalance}
      />
      {/* warning : some tokens (ex: EQ) have a fiatRates object, but with null values for all fiat currencies */}
      {balance.fiat(currency) !== null && !noFiat ? (
        <>
          {" "}
          (
          <Fiat amount={balance} isBalance={isBalance} noCountUp={noCountUp} />)
        </>
      ) : null}
    </span>
  )
}

export const TokensAndFiat: FC<TokensAndFiatProps> = (props) => (
  <Suspense>
    <TokensAndFiatInner {...props} />
  </Suspense>
)
