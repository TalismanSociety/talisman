import type { DotNetworkId, SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useMemo } from "react"

import { getBalanceClaimablePlancks } from "../utils/claimableRewards"
import { ROOT_NETUID } from "../utils/constants"

/**
 * Root positions whose balance carries claimable basket rewards, biggest claim first.
 * Sourced from balances rather than staking positions: the chain keeps basket entitlement
 * after a full unstake, so a candidate can have no stake left on its validator.
 */
export const useBittensorClaimCandidates = (networkId: DotNetworkId | null | undefined) => {
  const balances = useBalances()
  const ownedAccounts = useAccounts("owned")

  return useMemo(() => {
    if (!networkId) return []

    return balances.each
      .filter(
        (b) =>
          b.token?.type === "substrate-dtao" &&
          b.token.networkId === networkId &&
          b.token.netuid === ROOT_NETUID &&
          !!b.token.hotkey &&
          ownedAccounts.some((a) => isAddressEqual(a.address, b.address))
      )
      .map((balance) => ({
        id: balance.id,
        token: balance.token as SubDTaoToken,
        balance,
        claimablePlancks: getBalanceClaimablePlancks(balance),
      }))
      .filter((candidate) => candidate.claimablePlancks > 0n)
      .sort((a, b) => (a.claimablePlancks > b.claimablePlancks ? -1 : 1))
  }, [balances, networkId, ownedAccounts])
}

export type BittensorClaimCandidate = ReturnType<typeof useBittensorClaimCandidates>[number]
