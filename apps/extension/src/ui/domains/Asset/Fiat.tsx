import type { BalanceFormatter } from "@talismn/balances"
import type { TokenRateCurrency } from "@talismn/token-rates"
import { formatCurrency, getCurrencyFractionDigits, type Prettify } from "@talismn/util"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"
import { useFiatFromUsd } from "@ui/state/fiatFromUsd"
import { useSelectedCurrency } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import React, { type FC, useCallback, useMemo } from "react"
import CountUp from "react-countup"

const localeSeparators = new Intl.NumberFormat(undefined).formatToParts(1000.1)
const decimalSeparator = localeSeparators.find((p) => p.type === "decimal")?.value ?? "."
const groupSeparator = localeSeparators.find((p) => p.type === "group")?.value ?? ","

type FiatProps = {
  amount?: number | BalanceFormatter | null
  className?: string
  as?: "span" | "div"
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"]
  isBalance?: boolean
  noCountUp?: boolean
  forceCurrency?: TokenRateCurrency
  compact?: boolean
}

type DisplayValueProps = {
  amount: number
  currency: TokenRateCurrency
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"]
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
  compact,
}: FiatProps) => {
  const { refReveal, isRevealable, isRevealed, isHidden, effectiveNoCountUp } =
    useRevealableBalance(isBalance, noCountUp)

  const render = amount !== null && amount !== undefined

  const selectedCurrency = useSelectedCurrency()
  const currency = forceCurrency ?? selectedCurrency

  return (
    <span
      ref={refReveal}
      className={cn(
        "fiat whitespace-nowrap",
        isRevealable && "balance-revealable",
        isRevealed && "balance-reveal",
        className
      )}
    >
      {render && (
        <DisplayValue
          amount={isHidden ? 0 : typeof amount === "number" ? amount : (amount.fiat(currency) ?? 0)}
          currency={currency}
          currencyDisplay={currencyDisplay}
          isBalance={isBalance}
          noCountUp={effectiveNoCountUp}
          compact={compact}
        />
      )}
    </span>
  )
}

// Memoize to smooth up the count up animation
const DisplayValue = React.memo(
  ({
    amount,
    currency,
    currencyDisplay,
    isBalance,
    noCountUp,
    compact,
  }: DisplayValueProps & { compact?: boolean }) => {
    const decimalPlaces = isBalance
      ? getCurrencyFractionDigits(currency)
      : getPriceDecimalPlaces(amount)

    const format = useCallback(
      (amount = 0) => {
        const formatWithDecimals = (amount: number) =>
          formatCurrency(amount, currency, {
            currencyDisplay,
            notation: compact ? "compact" : "standard",
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: compact ? decimalPlaces : undefined,
          })

        const smallestBalance = 10 ** -decimalPlaces
        if (isBalance && amount > 0 && amount < smallestBalance)
          return `< ${formatWithDecimals(smallestBalance)}`

        return formatWithDecimals(amount)
      },
      [currency, currencyDisplay, decimalPlaces, isBalance, compact]
    )
    const formatted = useMemo(() => format(amount), [format, amount])

    if (noCountUp) return <>{formatted}</>
    return (
      <CountUp
        end={amount}
        decimals={decimalPlaces}
        decimal={decimalSeparator}
        separator={groupSeparator}
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

const getPriceDecimalPlaces = (amount: number) => {
  const decimalPlacesCount = getDecimalPlacesCount(amount)
  return amount !== 0 && decimalPlacesCount > 1 ? decimalPlacesCount + 2 : 2
}

type FiatFromUsdProps = Prettify<Omit<FiatProps, "amount"> & { amount: number | null | undefined }>

export const FiatFromUsd: FC<FiatFromUsdProps> = (props) => {
  const amount = useFiatFromUsd(props.amount)
  return <Fiat {...props} amount={amount} />
}
