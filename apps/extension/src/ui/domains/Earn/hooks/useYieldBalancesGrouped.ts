import { bind } from "@react-rxjs/core"
import { Loadable } from "@talismn/util"
import { YieldPositionGroup } from "extension-core"
import { Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

const DEFAULT_YIELD_BALANCES_GROUPED: Loadable<YieldPositionGroup[]> = {
  status: "loading",
  data: [],
}

const rawYieldBalancesGrouped$ = new Observable<Loadable<YieldPositionGroup[]>>((subscriber) => {
  const unsubscribe = api.yieldBalancesGroupedSubscribe(
    (loadable: Loadable<YieldPositionGroup[]>) => {
      subscriber.next(loadable)
    },
  )

  return () => {
    unsubscribe()
  }
})

export const [useYieldBalancesGrouped, yieldBalancesGrouped$] = bind(
  rawYieldBalancesGrouped$.pipe(shareReplay({ bufferSize: 1, refCount: true })),
  DEFAULT_YIELD_BALANCES_GROUPED,
)

// Hook that returns the same structure as useYieldBalances for compatibility
export const useYieldBalancesGroupedCompat = () => {
  const yieldBalancesGrouped = useYieldBalancesGrouped()

  return {
    yieldPositions: yieldBalancesGrouped.data || [],
    allBalances:
      yieldBalancesGrouped.data?.flatMap((group: YieldPositionGroup) => [
        ...group.activeBalances,
        ...group.claimableBalances,
      ]) || [],
    totalUsd:
      yieldBalancesGrouped.data
        ?.reduce((sum: number, group: YieldPositionGroup) => sum + group.totalAmountUsd, 0)
        .toString() || "0",
    positionsByAddress: new Map(), // Not used in current implementation
    groupedByToken: new Map(), // Not used in current implementation
    errors: [],
    isLoading: yieldBalancesGrouped.status === "loading",
    error: yieldBalancesGrouped.status === "error" ? yieldBalancesGrouped.error : undefined,
    refetch: () => {},
  }
}
