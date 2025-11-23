import { classNames } from "@talismn/util"
import { log } from "extension-shared"
import { FC, useMemo } from "react"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state"

export const BittensorAlphaPrice: FC<{
  taoTokenId: string
  price: string | null | undefined
  priceChange24h: string | null | undefined
  className?: string
  noTooltip?: boolean
}> = ({ taoTokenId, price, priceChange24h, className, noTooltip }) => {
  const tao = useToken(taoTokenId)

  const { change24h, changeClassName } = useMemo(() => {
    if (!tao || !price) return { change24h: null, changeClassName: null }

    try {
      const rawChange24h = priceChange24h
        ? new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 1,
            style: "percent",
            signDisplay: "always",
          }).format(Number(priceChange24h) / 100)
        : null

      // we dont want a sign (which is used for color check) if change displays as +0.0% or -0.0%
      const change24h = rawChange24h?.length
        ? rawChange24h.slice(1) === "0.0%"
          ? "0.0%"
          : rawChange24h
        : null

      const changeClassName = getPriceChangeClassName(change24h)

      return { change24h, changeClassName }
    } catch (err) {
      log.error("BittensorAlphaPrice - failed to format percent change", { priceChange24h, err })
      return { change24h: null, changeClassName: null }
    }
  }, [price, priceChange24h, tao])

  if (!price) return null

  return (
    <span className={className}>
      <Tokens
        symbol={tao?.symbol}
        decimals={tao?.decimals}
        amount={price}
        noCountUp
        noTooltip={noTooltip}
      />{" "}
      {change24h ? (
        <span className={classNames(changeClassName, changeClassName)}>{change24h}</span>
      ) : null}
    </span>
  )
}

const getPriceChangeClassName = (change24h: string | null) => {
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
