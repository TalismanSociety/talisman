import { useMemo } from "react"

import { useYieldxyzPositionsEnhanced } from "@ui/state/yield"

export const useYieldxyzYieldPositions = (
  yieldId: string | null | undefined,
  address: string | null | undefined,
) => {
  const positionsEnhanced = useYieldxyzPositionsEnhanced()

  const data = useMemo(() => {
    if (!yieldId || !address || !positionsEnhanced.data) return undefined

    return positionsEnhanced.data.filter(
      (pos) => pos.yieldId === yieldId && pos.address === address,
    )
  }, [yieldId, address, positionsEnhanced.data])

  return { ...positionsEnhanced, data }
}
