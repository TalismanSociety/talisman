import { AlienRunes } from "@talisman/components/AlienRunes"
import { classNames } from "@talismn/util"
import { MAX_DECIMALS_FORMAT, formatDecimals } from "@talismn/util"
import { useIsFeatureEnabled } from "@ui/hooks/useIsFeatureEnabled"
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
  noTooltip?: boolean
  noCountUp?: boolean
  isBalance?: boolean
  runesLength?: number
}

type DisplayValueProps = {
  num: number
  formatted: string
  symbol?: string | null
  noCountUp?: boolean
}

// Memoize to smooth up the count up animation
const DisplayValue: FC<DisplayValueProps> = React.memo(({ num, formatted, symbol, noCountUp }) => {
  if (noCountUp || formatted.startsWith("<")) return <>{`${formatted} ${symbol ?? ""}`.trim()}</>

  return (
    <>
      <CountUp
        end={num}
        decimals={num >= 1000 ? 0 : formatted.split(".")[1]?.length ?? 0} // define the decimals based on the formatted number
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

// TODO delete at some point
const LegacyTokens: FC<{
  value: number
  tooltip: string | null
  formatted: string
  symbol?: string | null
  isBalance?: boolean
  noCountUp?: boolean
  className?: string
}> = ({ formatted, symbol, value, tooltip, isBalance, noCountUp, className }) => {
  const { refReveal, isRevealable, isRevealed, effectiveNoCountUp } = useRevealableBalance(
    isBalance,
    noCountUp
  )

  return (
    <span
      ref={refReveal}
      className={classNames(
        "tokens",
        isRevealable && "balance-revealable",
        isRevealed && "balance-reveal",
        className
      )}
    >
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <span>
            <DisplayValue
              num={value}
              formatted={formatted}
              symbol={symbol}
              noCountUp={effectiveNoCountUp}
            />
          </span>
        </TooltipTrigger>
        {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
      </Tooltip>
    </span>
  )
}

const ModernTokens: FC<{
  value: number
  tooltip: string | null
  formatted: string
  symbol?: string | null
  isBalance?: boolean
  noCountUp?: boolean
  className?: string
  runesLength: number
}> = ({ formatted, symbol, value, tooltip, isBalance, noCountUp, className, runesLength }) => {
  const { isRevealed, effectiveNoCountUp } = useRevealableBalance(isBalance, noCountUp)

  return (
    <Tooltip placement="bottom-end">
      <TooltipTrigger asChild>
        {isRevealed ? (
          <span className={classNames("tokens", className)}>
            <DisplayValue
              num={value}
              formatted={formatted}
              symbol={symbol}
              noCountUp={effectiveNoCountUp}
            />
          </span>
        ) : (
          <AlienRunes
            length={runesLength}
            className={classNames("tokens", className)}
            scramble={!effectiveNoCountUp}
          />
        )}
      </TooltipTrigger>
      {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>
  )
}

export const Tokens: FC<TokensProps> = ({
  amount,
  symbol,
  decimals,
  className,
  noTooltip,
  noCountUp,
  isBalance = false,
  runesLength = 6,
}) => {
  const withAlienRunes = useIsFeatureEnabled("ALIEN_RUNES")

  const { num, formatted } = useMemo(() => {
    const num = BigNumber.isBigNumber(amount) ? amount.toNumber() : Number(amount)
    return isNaN(num) ? { num: null, formated: null } : { num, formatted: formatDecimals(num) }
  }, [amount])

  const tooltip = useMemo(
    () =>
      noTooltip
        ? null
        : `${formatDecimals(num, decimals ?? MAX_DECIMALS_FORMAT, { notation: "standard" })} ${
            symbol ?? ""
          }`.trim(),
    [num, decimals, noTooltip, symbol]
  )

  if (!formatted) return null

  // TODO FEATURE FLAG
  const Component = withAlienRunes ? ModernTokens : LegacyTokens

  return (
    <Component
      isBalance={isBalance}
      formatted={formatted}
      tooltip={tooltip}
      value={num}
      className={className}
      noCountUp={noCountUp}
      symbol={symbol}
      runesLength={runesLength}
    />
  )
}

export default Tokens
