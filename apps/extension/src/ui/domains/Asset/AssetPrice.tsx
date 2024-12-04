import { bind } from "@react-rxjs/core"
import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { FC } from "react"
import { combineLatest, map } from "rxjs"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { getTokenRates$, selectedCurrency$ } from "@ui/state"

const [useDisplayAssetPrice] = bind((tokenId: TokenId | null | undefined) =>
  combineLatest([getTokenRates$(tokenId), selectedCurrency$]).pipe(
    map(([rates, currency]) => {
      const rate = rates?.[currency]
      if (!rate) return null

      const compact = new Intl.NumberFormat(undefined, {
        maximumSignificantDigits: 4,
        style: "currency",
        currency,
        currencyDisplay: currency === "usd" ? "narrowSymbol" : "symbol",
        notation: rate.price >= 10_000 ? "compact" : "standard", // account for very low currencies such as korean won
      }).format(rate.price)

      const full = new Intl.NumberFormat(undefined, {
        roundingPriority: "morePrecision",
        style: "currency",
        currency,
        currencyDisplay: currency === "usd" ? "narrowSymbol" : "symbol",
        notation: "standard",
      }).format(rate.price)

      const rawChange24h = rate.change24h
        ? new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 1,
            style: "percent",
            signDisplay: "always",
          }).format(rate.change24h / 100)
        : undefined

      // exclude +0.0% and -0.0%, display nothing in that case
      const change24h = rawChange24h?.length
        ? rawChange24h.slice(1) === "0.0%"
          ? "0.0%" // we dont want a sign if it's +0.0% or -0.0%
          : rawChange24h
        : undefined

      return {
        compact,
        full,
        change24h,
      }
    }),
  ),
)

export const AssetPrice: FC<{
  tokenId: TokenId | null | undefined
  as?: "div" | "span"
  className?: string
  priceClassName?: string
  changeClassName?: string
  noTooltip?: boolean
  noChange?: boolean
}> = ({
  as: Container = "div",
  tokenId,
  noTooltip,
  noChange,
  className,
  priceClassName,
  changeClassName,
}) => {
  const price = useDisplayAssetPrice(tokenId)

  if (!price) return null

  return (
    <Tooltip placement="bottom-start">
      <TooltipTrigger asChild>
        <Container className={classNames("whitespace-nowrap", className)}>
          <span className={priceClassName}>{price.compact} </span>
          {!noChange && price.change24h ? (
            <span
              className={classNames(
                price.change24h.startsWith("+") && "text-price-up",
                price.change24h.startsWith("-") && "text-price-down",
                changeClassName,
              )}
            >
              {price.change24h}
            </span>
          ) : null}
        </Container>
      </TooltipTrigger>
      {!noTooltip && <TooltipContent>{price.full}</TooltipContent>}
    </Tooltip>
  )
}
