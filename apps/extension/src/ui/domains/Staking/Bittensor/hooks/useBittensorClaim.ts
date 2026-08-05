import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useMemo } from "react"

import { type BittensorClaimTarget, getBittensorClaim } from "../utils/claimableRewards"

/** @see getBittensorClaim */
export const useBittensorClaim = (target: BittensorClaimTarget | null) => {
  const balances = useBalances()
  const ownedAccounts = useAccounts("owned")

  return useMemo(() => {
    if (!target) return null
    return getBittensorClaim(
      balances.each,
      ownedAccounts.map((a) => a.address),
      target
    )
  }, [balances, ownedAccounts, target])
}
