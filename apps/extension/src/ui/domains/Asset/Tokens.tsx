import { classNames } from "@talismn/util"
import { MAX_DECIMALS_FORMAT, formatDecimals } from "@talismn/util"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"
import BigNumber from "bignumber.js"
import React, { FC, useMemo } from "react"
import CountUp from "react-countup"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type TokensProps = {
  amount?: string | number | null | BigNumber
  symbol?: string | null
  decimals?: number | null
  className?: string
  as?: "span" | "div"
  noTooltip?: boolean
  noCountUp?: boolean
  isBalance?: boolean
}

type DisplayValueProps = {
  amount: string | number | BigNumber
  symbol?: string | null
  noCountUp?: boolean
}

// Memoize to smooth up the count up animation
const DisplayValue: FC<DisplayValueProps> = React.memo(({ amount, symbol, noCountUp }) => {
  const num = useMemo(
    () => (BigNumber.isBigNumber(amount) ? amount.toNumber() : Number(amount)),
    [amount]
  )

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
})
DisplayValue.displayName = "DisplayValue"

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
  const { refReveal, isRevealable, isRevealed, isHidden, effectiveNoCountUp } =
    useRevealableBalance(isBalance, noCountUp)

  const tooltip = useMemo(
    () =>
      noTooltip
        ? null
        : `${formatDecimals(amount, decimals ?? MAX_DECIMALS_FORMAT, { notation: "standard" })} ${
            symbol ?? ""
          }`.trim(),
    [amount, decimals, noTooltip, symbol]
  )

  const render = amount !== null && amount !== undefined

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
      {render && (
        <Tooltip placement="bottom-end">
          <TooltipTrigger asChild>
            <span>
              <DisplayValue
                amount={isHidden ? 0 : amount}
                symbol={symbol}
                noCountUp={effectiveNoCountUp}
              />
            </span>
          </TooltipTrigger>
          {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
        </Tooltip>
      )}
    </Component>
  )
}

export default Tokens
