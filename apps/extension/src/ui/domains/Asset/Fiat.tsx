import { BalanceFormatter } from "@talismn/balances"
import { TokenRateCurrency } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import React, { useCallback, useMemo } from "react"
import CountUp from "react-countup"

import { fiatDecimalSeparator, fiatGroupSeparator, formatFiat } from "@talisman/util/formatFiat"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"

type FiatProps = {
  amount?: number | BalanceFormatter | null
  className?: string
  as?: "span" | "div"
  currencyDisplay?: string
  isBalance?: boolean
  noCountUp?: boolean
  forceCurrency?: TokenRateCurrency
}

type DisplayValueProps = {
  amount: number
  currency?: Intl.NumberFormatOptions["currency"]
  currencyDisplay?: string
  isBalance?: boolean
  noCountUp?: boolean
}

export const Fiat = ({
  amount,
  className,
  currencyDisplay,
  isBalance = false,
  noCountUp = false,
  forceCurrency,
}: FiatProps) => {
  const { refReveal, isRevealable, isRevealed, isHidden, effectiveNoCountUp } =
    useRevealableBalance(isBalance, noCountUp)

  const render = amount !== null && amount !== undefined

  const selectedCurrency = useSelectedCurrency()
  const currency = forceCurrency ?? selectedCurrency

  return (
    <span
      ref={refReveal}
      className={classNames(
        "fiat whitespace-nowrap",
        isRevealable && "balance-revealable",
        isRevealed && "balance-reveal",
        className
      )}
    >
      {render && (
        <DisplayValue
          amount={isHidden ? 0 : typeof amount === "number" ? amount : amount.fiat(currency) ?? 0}
          currency={currency}
          currencyDisplay={currencyDisplay}
          isBalance={isBalance}
          noCountUp={effectiveNoCountUp}
        />
      )}
    </span>
  )
}

// Memoize to smooth up the count up animation
const DisplayValue = React.memo(
  ({ amount, currency, currencyDisplay, isBalance, noCountUp }: DisplayValueProps) => {
    const decimalPlacesCount = getDecimalPlacesCount(amount)
    const decimalPlaces =
      amount !== 0 && !isBalance && decimalPlacesCount > 1 ? decimalPlacesCount + 1 : 2

    const format = useCallback(
      (amount = 0) => {
        if (amount !== 0 && isBalance && amount < 0.01)
          return `< ${formatFiat(0.01, currency, currencyDisplay, 2)}`

        return formatFiat(amount, currency, currencyDisplay, decimalPlaces)
      },
      [currency, currencyDisplay, decimalPlaces, isBalance]
    )
    const formatted = useMemo(() => format(amount), [format, amount])

    if (noCountUp) return <>{formatted}</>
    return (
      <CountUp
        end={amount}
        decimals={decimalPlaces}
        decimal={fiatDecimalSeparator}
        separator={fiatGroupSeparator}
        duration={0.4}
        formattingFn={format}
        useEasing
        preserveValue
      />
    )
  }
)
DisplayValue.displayName = "DisplayValue"

/**
 * Gets the decimalPlacesCount for a number.
 *
 * For any numbers between -1 and 1, decimalPlacesCount represents the first non-zero decimal place.
 * So for 0.1, decimalPlacesCount is 1. For 0.01, it is 2. For 0.001 it is 3. For 0.0001 it is 4, etc.
 *
 * For any numbers less than -1 or greater than 1, decimalPlacesCount is 0.
 *
 * Some more examples:
 *
 *     Input  - Output
 *     ****** - ******
 *     99.000 - 0
 *      1.000 - 0
 *      0.100 - 1
 *      0.069 - 2
 *      0.009 - 3
 *     -0.009 - 3
 *     -0.069 - 2
 *     -0.100 - 1
 *     -1.000 - 0
 */
const getDecimalPlacesCount = (amount: number) =>
  Math.abs(Math.min(0, Math.floor(Math.log10(Math.abs(amount)))))
