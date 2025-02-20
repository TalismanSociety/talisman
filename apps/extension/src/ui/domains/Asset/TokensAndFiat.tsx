import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { FC, Suspense, useMemo } from "react"

import { useSelectedCurrency, useToken, useTokenRates } from "@ui/state"

import { Fiat } from "./Fiat"
import { TokenLogo } from "./TokenLogo"
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
  withLogo?: boolean
  logoClassName?: string
  tokensClassName?: string
  fiatClassName?: string
}

const TokensAndFiatInner: FC<TokensAndFiatProps> = ({
  planck,
  tokenId,
  className,
  noTooltip,
  noCountUp,
  isBalance,
  noFiat,
  tokensClassName,
  fiatClassName,
  withLogo,
  logoClassName,
}) => {
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)

  const balance = useMemo(
    () =>
      token && planck !== undefined
        ? new BalanceFormatter(planck, token.decimals, tokenRates)
        : null,
    [planck, token, tokenRates],
  )
  const currency = useSelectedCurrency()

  if (!balance || !token) return null

  return (
    <span className={className}>
      {withLogo ? (
        <TokenLogo
          tokenId={tokenId}
          className={classNames(
            "mr-[0.3em] inline-block size-[1.2em] shrink-0 align-sub",
            logoClassName,
          )}
        />
      ) : null}
      <Tokens
        amount={balance.tokens}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp={noCountUp}
        noTooltip={noTooltip}
        isBalance={isBalance}
        className={tokensClassName}
      />
      {/* warning : some tokens (ex: EQ) have a fiatRates object, but with null values for all fiat currencies */}
      {balance.fiat(currency) !== null && !noFiat ? (
        <>
          {" "}
          (
          <Fiat
            amount={balance}
            isBalance={isBalance}
            noCountUp={noCountUp}
            className={fiatClassName}
          />
          )
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
