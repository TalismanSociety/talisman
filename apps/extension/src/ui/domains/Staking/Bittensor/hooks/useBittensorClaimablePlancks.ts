import { type DTaoClaimTarget, findDTaoClaimablePlancks } from "@talismn/balances"
import { useBalances } from "@ui/state/balances"
import { useMemo } from "react"

/** @see findDTaoClaimablePlancks */
export const useBittensorClaimablePlancks = (target: DTaoClaimTarget | null) => {
  const balances = useBalances("owned")

  return useMemo(
    () => (target ? findDTaoClaimablePlancks(balances.each, target) : null),
    [balances, target]
  )
}
