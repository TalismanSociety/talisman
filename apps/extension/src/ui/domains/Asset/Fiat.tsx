import { TokenRateCurrency } from "@core/types"
import { classNames } from "@talisman/util/classNames"
import { fiatDecimalSeparator, fiatGroupSeparator, formatFiat } from "@talisman/util/formatFiat"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"
import { FC, useCallback, useMemo } from "react"
import CountUp from "react-countup"

type FiatProps = {
  amount?: number | null
  currency?: TokenRateCurrency | null
  className?: string
  as?: "span" | "div"
  noCountUp?: boolean
  isBalance?: boolean
}

type DisplayValueProps = {
  amount: number
  currency?: Intl.NumberFormatOptions["currency"]
  noCountUp?: boolean
}

const DisplayValue: FC<DisplayValueProps> = ({ amount, currency, noCountUp }) => {
  const format = useCallback((amount = 0) => formatFiat(amount, currency), [currency])
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
  currency,
  className,
  noCountUp = false,
  isBalance = false,
}: FiatProps) => {
  const { refReveal, isRevealable, isRevealed, isHidden, effectiveNoCountUp } =
    useRevealableBalance(isBalance, noCountUp)

  const render = amount !== null && amount !== undefined

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
          amount={isHidden ? 0 : amount}
          currency={currency || undefined}
          noCountUp={effectiveNoCountUp}
        />
      )}
    </span>
  )
}

export default Fiat
