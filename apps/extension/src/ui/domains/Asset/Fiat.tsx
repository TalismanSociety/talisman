import CountUp from "react-countup"
import { FC, useCallback, useMemo } from "react"
import { TokenRateCurrency } from "@core/types"
import { fiatDecimalSeparator, fiatGroupSeparator, formatFiat } from "@talisman/util/formatFiat"
import { classNames } from "@talisman/util/classNames"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"

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
  const format = useCallback((amount: number = 0) => formatFiat(amount, currency), [currency])
  const formatted = useMemo(() => format(amount), [format, amount])

  const countUpDecimals = useMemo(
    () => (amount >= 1000 ? 0 : formatted.toString().split(fiatDecimalSeparator)[1]?.length ?? 0),
    [amount, formatted]
  )

  if (noCountUp) return <>{formatted}</>

  return (
    <CountUp
      end={amount}
      decimals={countUpDecimals}
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
  const { refReveal, isRevealable, isRevealed, effectiveNoCountUp } = useRevealableBalance(
    isBalance,
    noCountUp
  )

  if (amount === null || amount === undefined) return null

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
      <DisplayValue
        amount={amount}
        currency={currency || undefined}
        noCountUp={effectiveNoCountUp}
      />
    </span>
  )
}

export default Fiat
