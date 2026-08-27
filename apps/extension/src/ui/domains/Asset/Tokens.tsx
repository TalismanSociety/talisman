import { formatDecimals, MAX_DECIMALS_FORMAT } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useRevealableBalance } from "@ui/hooks/useRevealableBalance"
import { useSettingValue } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import BigNumber from "bignumber.js"
import React, { type FC, useMemo } from "react"
import CountUp from "react-countup"

const SATS_PER_BTC = 100_000_000

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

// Left-to-Right Mark (LRM) prevents RTL symbols (e.g. Hebrew "פ") from causing bidi text reordering
const LRM = "\u200E"

// Memoize to smooth up the count up animation
const DisplayValue: FC<DisplayValueProps> = React.memo(({ amount, symbol, noCountUp }) => {
  const num = useMemo(
    () => (BigNumber.isBigNumber(amount) ? amount.toNumber() : Number(amount)),
    [amount]
  )

  const formated = useMemo(() => formatDecimals(num), [num])

  if (Number.isNaN(num)) return null

  // Append LRM after symbol to anchor RTL characters in LTR context
  const symbolWithLrm = symbol ? `${symbol}${LRM}` : ""

  if (noCountUp || formated.startsWith("<")) return <>{`${formated} ${symbolWithLrm}`.trim()}</>

  return (
    <>
      <CountUp
        end={num}
        decimals={num >= 1000 ? 0 : (formated.split(".")[1]?.length ?? 0)} // define the decimals based on the formatted number
        decimal="."
        separator=","
        duration={0.4}
        formattingFn={formatDecimals}
        useEasing
        preserveValue
      />{" "}
      {symbolWithLrm}
    </>
  )
})
DisplayValue.displayName = "DisplayValue"

export const Tokens: FC<TokensProps> = ({
  amount: btcAmount,
  symbol: btcSymbol,
  decimals: btcDecimals,
  className,
  as: Component = "span",
  noTooltip,
  noCountUp,
  isBalance = false,
}) => {
  const { refReveal, isRevealable, isRevealed, isHidden, effectiveNoCountUp } =
    useRevealableBalance(isBalance, noCountUp)

  // sats display mode: bitcoiners think in sats, not decimals of BTC. A known
  // non-8-decimals token (e.g. an 18-decimals EVM lookalike named "BTC") is excluded;
  // callers that omit decimals (portfolio rows) rely on the symbol alone.
  const btcDisplaySats = useSettingValue("btcDisplaySats")
  const { amount, symbol, decimals } = useMemo(() => {
    if (
      !btcDisplaySats ||
      btcSymbol !== "BTC" ||
      (btcDecimals != null && btcDecimals !== 8) ||
      btcAmount === null ||
      btcAmount === undefined
    )
      return { amount: btcAmount, symbol: btcSymbol, decimals: btcDecimals }
    return {
      amount: new BigNumber(btcAmount).multipliedBy(SATS_PER_BTC),
      symbol: "sats",
      decimals: 0,
    }
  }, [btcDisplaySats, btcAmount, btcSymbol, btcDecimals])

  // Append LRM after symbol to anchor RTL characters in LTR context
  const symbolWithLrm = symbol ? `${symbol}${LRM}` : ""

  const tooltipAmount = useMemo(
    () =>
      `${formatDecimals(amount, decimals ?? MAX_DECIMALS_FORMAT, { notation: "standard" })} ${symbolWithLrm}`.trim(),
    [amount, decimals, symbolWithLrm]
  )
  const tooltip = useMemo(() => (noTooltip ? null : tooltipAmount), [noTooltip, tooltipAmount])

  const render = amount !== null && amount !== undefined

  return (
    <Component
      ref={refReveal}
      className={cn(
        "tokens",
        isRevealable && "balance-revealable",
        isRevealed && "balance-reveal",
        className
      )}
    >
      {render && (
        <Tooltip placement="bottom-end">
          <TooltipTrigger asChild>
            <span data-amount={tooltipAmount}>
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
