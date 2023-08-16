import { fiatDecimalSeparator, fiatGroupSeparator, formatFiat } from "@talisman/util/formatFiat"
import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { selectedCurrencyState } from "@ui/atoms"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"
import { FC, useCallback, useMemo } from "react"
import CountUp from "react-countup"
import { useRecoilValue } from "recoil"

type FiatProps = {
  amount?: number | BalanceFormatter | null
  className?: string
  as?: "span" | "div"
  noCountUp?: boolean
  isBalance?: boolean
  hideSymbol?: boolean
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
  className,
  noCountUp = false,
  isBalance = false,
  hideSymbol = false,
}: FiatProps) => {
  const { refReveal, isRevealable, isRevealed, isHidden, effectiveNoCountUp } =
    useRevealableBalance(isBalance, noCountUp)

  const render = amount !== null && amount !== undefined

  const currency = useRecoilValue(selectedCurrencyState)

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
          currency={hideSymbol ? undefined : currency}
          noCountUp={effectiveNoCountUp}
        />
      )}
    </span>
  )
}

export default Fiat
