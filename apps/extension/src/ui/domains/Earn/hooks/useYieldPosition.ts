import { YieldPositionGroup } from "extension-core"
import { useMemo } from "react"

import { useYieldBalancesGrouped } from "./useYieldBalancesGrouped"

export const useYieldPosition = (yieldId: string | undefined) => {
  const yieldBalancesGrouped = useYieldBalancesGrouped()

  const position = useMemo(() => {
    if (!yieldId || yieldBalancesGrouped.status !== "success" || !yieldBalancesGrouped.data)
      return null

    return (
      yieldBalancesGrouped.data.find((pos: YieldPositionGroup) => pos.yieldId === yieldId) || null
    )
  }, [yieldId, yieldBalancesGrouped])

  return position
}
