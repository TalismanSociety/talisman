import { formatCompactPrice, formatPrice } from "@talismn/util"
import { type FC, useMemo } from "react"

export const CompactPrice: FC<{ price: number; currency: string }> = ({ price, currency }) => {
  const parts = useMemo(() => formatCompactPrice(price, currency), [price, currency])

  if (parts.kind === "plain") return parts.text

  return (
    <>
      <span className="sr-only">{formatPrice(price, currency, true)}</span>
      <span aria-hidden className="select-none">
        {parts.head}0<sub>{parts.zeroCount}</sub>
        {parts.tail}
      </span>
    </>
  )
}
