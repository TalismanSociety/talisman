import { AlienRunes } from "@talisman/components/AlienRunes"
import { fiatDecimalSeparator, fiatGroupSeparator, formatFiat } from "@talisman/util/formatFiat"
import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useIsFeatureEnabled } from "@ui/hooks/useIsFeatureEnabled"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"
import React, { FC, useCallback, useMemo } from "react"
import CountUp from "react-countup"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type FiatProps = {
  amount?: number | BalanceFormatter | null
  className?: string
  currencyDisplay?: string
  isBalance?: boolean
  noCountUp?: boolean
  runesLength?: number
}

type DisplayValueProps = {
  amount: number
  currency?: Intl.NumberFormatOptions["currency"]
  currencyDisplay?: string
  isBalance?: boolean
  noCountUp?: boolean
}

// TODO delete at some point
const LegacyFiat: FC<FiatProps> = ({
  amount,
  className,
  currencyDisplay,
  isBalance = false,
  noCountUp = false,
}) => {
  const { refReveal, isRevealable, isRevealed, isHidden, effectiveNoCountUp } =
    useRevealableBalance(isBalance, noCountUp)

  const render = amount !== null && amount !== undefined

  const currency = useSelectedCurrency()

  return (
    <span
      ref={refReveal}
      className={classNames(
        "fiat",
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

const HiddenFiat: FC<{
  amount: number | BalanceFormatter
  className?: string
  currencyDisplay?: string
  runesLength?: number
}> = ({ amount, className, currencyDisplay, runesLength = 5 }) => {
  const currency = useSelectedCurrency()
  const formatted = useMemo(() => {
    const num = typeof amount === "number" ? amount : (!!amount && amount.fiat(currency)) || 0
    const decimalPlaces = 2

    return !!num && num < 0.01
      ? `< ${formatFiat(0.01, currency, currencyDisplay, 2)}`
      : formatFiat(num, currency, currencyDisplay, decimalPlaces)
  }, [amount, currency, currencyDisplay])

  return (
    <Tooltip placement="bottom-end">
      <TooltipTrigger asChild>
        <AlienRunes length={runesLength} className={classNames("fiat", className)} />
      </TooltipTrigger>
      {formatted && <TooltipContent>{formatted}</TooltipContent>}
    </Tooltip>
  )
}

const ModernFiat: FC<FiatProps> = ({
  amount,
  className,
  currencyDisplay,
  isBalance = false,
  noCountUp = false,
  runesLength = 5,
}) => {
  const { isRevealed, effectiveNoCountUp } = useRevealableBalance(isBalance, noCountUp)

  const currency = useSelectedCurrency()

  if (amount === null || amount === undefined) return null

  if (!isRevealed) {
    return (
      <HiddenFiat
        amount={amount}
        runesLength={runesLength}
        className={className}
        currencyDisplay={currencyDisplay}
      />
    )
  }

  return (
    <span className={classNames("fiat", className)}>
      <DisplayValue
        amount={typeof amount === "number" ? amount : amount.fiat(currency) ?? 0}
        currency={currency}
        currencyDisplay={currencyDisplay}
        isBalance={isBalance}
        noCountUp={effectiveNoCountUp}
      />
    </span>
  )
}

export const Fiat: FC<FiatProps> = (props) => {
  const withAlienRunes = useIsFeatureEnabled("ALIEN_RUNES")

  const Component = withAlienRunes ? ModernFiat : LegacyFiat
  return <Component {...props} />
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
