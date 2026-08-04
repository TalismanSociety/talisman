import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useMemo } from "react"

import { getBittensorClaimCandidates } from "../utils/claimableRewards"

/** @see getBittensorClaimCandidates */
export const useBittensorClaimCandidates = (networkId: DotNetworkId | null | undefined) => {
  const balances = useBalances()
  const ownedAccounts = useAccounts("owned")

  return useMemo(() => {
    if (!networkId) return []
    return getBittensorClaimCandidates(
      balances.each,
      ownedAccounts.map((a) => a.address),
      [networkId]
    )
  }, [balances, networkId, ownedAccounts])
}
