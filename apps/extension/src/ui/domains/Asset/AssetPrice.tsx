import { bind } from "@react-rxjs/core"
import { TokenId } from "@talismn/chaindata-provider"
import { classNames, formatPrice } from "@talismn/util"
import { FC } from "react"
import { combineLatest, map } from "rxjs"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { getTokenRates$, selectedCurrency$ } from "@ui/state"

const [useDisplayAssetPrice] = bind((tokenId: TokenId | null | undefined) =>
  combineLatest([getTokenRates$(tokenId), selectedCurrency$]).pipe(
    map(([rates, currency]) => {
      const rate = rates?.[currency]
      if (!rate) return null

      const compact = formatPrice(rate.price, currency, true)

      const full = formatPrice(rate.price, currency, false)

      const rawChange24h = rate.change24h
        ? new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 1,
            style: "percent",
            signDisplay: "always",
          }).format(rate.change24h / 100)
        : undefined

      // we dont want a sign (which is used for color check) if change displays as +0.0% or -0.0%
      const change24h = rawChange24h?.length
        ? rawChange24h.slice(1) === "0.0%"
          ? "0.0%"
          : rawChange24h
        : undefined

      const changeClassName = getPriceChangeClassName(change24h)

      return {
        compact,
        full,
        change24h,
        changeClassName,
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
            <span className={classNames(price.changeClassName, changeClassName)}>
              {price.change24h}
            </span>
          ) : null}
        </Container>
      </TooltipTrigger>
      {!noTooltip && <TooltipContent>{price.full}</TooltipContent>}
    </Tooltip>
  )
}

const getPriceChangeClassName = (change24h: string | undefined) => {
  switch (change24h?.[0]) {
    case "+":
      return "text-price-up"
    case "-":
      return "text-price-down"
    case "0": // 0.0%
      return "text-body-inactive"
    default:
      return null
  }
}
