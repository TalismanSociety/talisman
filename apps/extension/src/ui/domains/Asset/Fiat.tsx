import { fiatDecimalSeparator, fiatGroupSeparator, formatFiat } from "@talisman/util/formatFiat"
import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"
import { useCallback, useMemo } from "react"
import CountUp from "react-countup"

type FiatProps = {
  amount?: number | BalanceFormatter | null
  className?: string
  as?: "span" | "div"
  noCountUp?: boolean
  isBalance?: boolean
  currencyDisplay?: string
}

type DisplayValueProps = {
  amount: number
  currency?: Intl.NumberFormatOptions["currency"]
  currencyDisplay?: string
  noCountUp?: boolean
}

export const Fiat = ({
  amount,
  className,
  noCountUp = false,
  isBalance = false,
  currencyDisplay,
}: FiatProps) => {
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
          noCountUp={effectiveNoCountUp}
        />
      )}
    </span>
  )
}

const DisplayValue = ({ amount, currency, currencyDisplay, noCountUp }: DisplayValueProps) => {
  /**
   * Represents the first non-zero decimal place for numbers between -1 and 1
   * For example:
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
  const decimalsFactor = Math.abs(Math.min(0, Math.floor(Math.log10(Math.abs(amount)))))
  const decimalPlaces = amount !== 0 && decimalsFactor > 1 ? decimalsFactor + 1 : 2

  const format = useCallback(
    (amount = 0) => formatFiat(amount, currency, currencyDisplay, decimalPlaces),
    [currency, currencyDisplay, decimalPlaces]
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
