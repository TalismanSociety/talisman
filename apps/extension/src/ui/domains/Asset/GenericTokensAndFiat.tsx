import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { FC, Suspense, useMemo } from "react"

import { useSelectedCurrency, useTokenRatesFromUsd } from "@ui/state"

import { AssetLogo } from "./AssetLogo"
import { Fiat } from "./Fiat"
import { Tokens } from "./Tokens"

type GenericTokensAndFiatProps = {
  planck?: string | bigint
  symbol: string
  decimals: number
  logo?: string | null
  priceUsd?: number | null
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

const GenericTokensAndFiatInner: FC<GenericTokensAndFiatProps> = ({
  planck,
  symbol,
  decimals,
  priceUsd,
  logo,
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
  const tokenRates = useTokenRatesFromUsd(priceUsd)

  const balance = useMemo(
    () =>
      typeof decimals === "number" && (typeof planck === "bigint" || typeof planck === "string")
        ? new BalanceFormatter(planck, decimals, tokenRates)
        : null,
    [decimals, planck, tokenRates],
  )
  const currency = useSelectedCurrency()

  if (!balance) return null

  return (
    <span className={className}>
      {withLogo ? (
        <AssetLogo
          url={logo}
          className={classNames(
            "mr-[0.3em] inline-block size-[1.2em] shrink-0 align-sub",
            logoClassName,
          )}
        />
      ) : null}
      <Tokens
        amount={balance.tokens}
        decimals={decimals}
        symbol={symbol}
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

export const GenericTokensAndFiat: FC<GenericTokensAndFiatProps> = (props) => (
  <Suspense>
    <GenericTokensAndFiatInner {...props} />
  </Suspense>
)
