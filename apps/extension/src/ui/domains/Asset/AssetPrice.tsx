import { bind } from "@react-rxjs/core"
import type { Balances } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { formatPrice } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { selectedCurrency$ } from "@ui/state/settings"
import { getTokenRates$ } from "@ui/state/tokenRates"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { combineLatest, map } from "rxjs"

const [useDisplayAssetPrice] = bind(
  (tokenId: TokenId | null | undefined, balances: Balances | null | undefined) =>
    combineLatest([getTokenRates$(tokenId), selectedCurrency$]).pipe(
      map(([rates, currency]) => {
        if (!tokenId) return null

        let rate = rates?.[currency]

        // some token rates aren't stored in the global token rates map (e.g. substrate-dtao tokens) and must be picked from balance object
        if (!rate && balances) rate = balances.find({ tokenId })?.each[0]?.rates?.[currency]

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
      })
    )
)

export const AssetPrice: FC<{
  tokenId: TokenId | null | undefined
  balances: Balances | null | undefined
  as?: "div" | "span"
  className?: string
  priceClassName?: string
  changeClassName?: string
  noTooltip?: boolean
  noChange?: boolean
}> = ({
  as: Container = "div",
  tokenId,
  balances,
  noTooltip,
  noChange,
  className,
  priceClassName,
  changeClassName,
}) => {
  const price = useDisplayAssetPrice(tokenId, balances)

  if (!price) return null

  return (
    <Tooltip placement="bottom-start">
      <TooltipTrigger asChild>
        <Container className={cn("whitespace-nowrap", className)}>
          <span className={priceClassName}>{price.compact} </span>
          {!noChange && price.change24h ? (
            <span className={cn(price.changeClassName, changeClassName)}>{price.change24h}</span>
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
