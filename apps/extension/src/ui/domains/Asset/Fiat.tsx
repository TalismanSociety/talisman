import { fiatDecimalSeparator, fiatGroupSeparator, formatFiat } from "@talisman/util/formatFiat"
import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"
import { FC, useCallback, useMemo } from "react"
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

const DisplayValue: FC<DisplayValueProps> = ({ amount, currency, currencyDisplay, noCountUp }) => {
  const format = useCallback(
    (amount = 0) => formatFiat(amount, currency, currencyDisplay),
    [currency, currencyDisplay]
  )
  const formatted = useMemo(() => format(amount), [format, amount])

  if (noCountUp) return <>{formatted}</>

  return (
    <CountUp
      end={amount}
      decimals={2}
      decimal={fiatDecimalSeparator}
      separator={fiatGroupSeparator}
      duration={0.4}
      formattingFn={format}
      useEasing
      preserveValue
    />
  )
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

export default Fiat
