import { WithTooltip } from "@talisman/components/Tooltip"
import { formatDecimals, MAX_DECIMALS_FORMAT } from "talisman-utils"
import CountUp from "react-countup"
import { FC, useMemo } from "react"
import { classNames } from "@talisman/util/classNames"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"

type TokensProps = {
  amount?: string | number | null
  symbol?: string | null
  decimals?: number | null
  className?: string
  as?: "span" | "div"
  noTooltip?: boolean
  noCountUp?: boolean
  isBalance?: boolean
}

type DisplayValueProps = {
  amount: string | number
  symbol?: string | null
  noCountUp?: boolean
}

const DisplayValue: FC<DisplayValueProps> = ({ amount, symbol, noCountUp }) => {
  const num = Number(amount)

  const formated = useMemo(() => formatDecimals(num), [num])

  if (isNaN(num)) return null

  if (noCountUp || formated.startsWith("<")) return <>{`${formated} ${symbol ?? ""}`.trim()}</>

  return (
    <>
      <CountUp
        end={num}
        decimals={num >= 1000 ? 0 : formated.split(".")[1]?.length ?? 0} // define the decimals based on the formatted number
        decimal="."
        separator=","
        duration={0.4}
        formattingFn={formatDecimals}
        useEasing
        preserveValue
      />{" "}
      {symbol ?? ""}
    </>
  )
}

export const Tokens: FC<TokensProps> = ({
  amount,
  symbol,
  decimals,
  className,
  as: Component = "span",
  noTooltip,
  noCountUp,
  isBalance = false,
}) => {
  const { refReveal, isRevealable, isRevealed, effectiveNoCountUp } = useRevealableBalance(
    isBalance,
    noCountUp
  )

  const tooltip = useMemo(
    () =>
      noTooltip
        ? null
        : `${formatDecimals(amount, decimals ?? MAX_DECIMALS_FORMAT, { notation: "standard" })} ${
            symbol ?? ""
          }`.trim(),
    [amount, decimals, noTooltip, symbol]
  )

  if (amount === null || amount === undefined) return null

  return (
    <Component
      ref={refReveal}
      className={classNames(
        "tokens",
        isRevealable && "balance-revealable",
        isRevealed && "balance-reveal",
        className
      )}
    >
      <WithTooltip as="span" tooltip={tooltip} noWrap>
        <DisplayValue amount={amount} symbol={symbol} noCountUp={effectiveNoCountUp} />
      </WithTooltip>
    </Component>
  )
}

export default Tokens
