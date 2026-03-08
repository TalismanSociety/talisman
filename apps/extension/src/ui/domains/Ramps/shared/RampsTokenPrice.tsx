import type { TokenRatesList } from "@talismn/token-rates"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useToken } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { type FC, useMemo } from "react"

export const RampsTokenPrice: FC<{
  tokenId: string | null | undefined
  tokenRates: TokenRatesList | null | undefined
  isLoading: boolean
}> = ({ tokenId, tokenRates, isLoading }) => {
  const selectedCurrency = useSelectedCurrency()
  const token = useToken(tokenId)
  const price = useMemo(
    () =>
      tokenId && tokenRates?.[tokenId]
        ? (tokenRates?.[tokenId]?.[selectedCurrency]?.price ?? null)
        : null,
    [selectedCurrency, tokenId, tokenRates]
  )

  if (tokenId && isLoading)
    return (
      <span className="animate-pulse rounded-xs bg-body-disabled text-body-disabled">
        1 XXX = XXXX.XX XXX
      </span>
    )

  if (!token || !price) return null

  return (
    <span className="text-body-disabled text-tiny">
      1 {token?.symbol} ≈ <Fiat amount={price} forceCurrency={selectedCurrency} noCountUp />
    </span>
  )
}
