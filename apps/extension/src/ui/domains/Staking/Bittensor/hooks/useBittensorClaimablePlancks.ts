import { useBalances } from "@ui/state/balances"
import { useMemo } from "react"

import { type BittensorClaimTarget, getBittensorClaimablePlancks } from "../utils/claimableRewards"

/** @see getBittensorClaimablePlancks */
export const useBittensorClaimablePlancks = (target: BittensorClaimTarget | null) => {
  const balances = useBalances("owned")

  return useMemo(
    () => (target ? getBittensorClaimablePlancks(balances.each, target) : null),
    [balances, target]
  )
}
