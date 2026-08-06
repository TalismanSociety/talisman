import type { Address } from "@core/types/base"
import { type Balance, type DTaoClaimTarget, getDTaoClaimablePlancks } from "@talismn/balances"
import type { DotNetworkId, SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { useBalances } from "@ui/state/balances"
import { useMemo } from "react"

import { ROOT_NETUID } from "../utils/constants"

export type BittensorClaimCandidate = {
  id: string
  token: SubDTaoToken
  balance: Balance
  claimablePlancks: bigint
  target: DTaoClaimTarget
}

/**
 * Root positions whose balance carries claimable basket rewards, biggest claim first.
 * Sourced from balances rather than staking positions: the chain keeps basket entitlement
 * after a full unstake, so a candidate can have no stake left on its validator.
 */
export const useBittensorClaimCandidates = (
  networkId: DotNetworkId,
  addresses?: Address[]
): BittensorClaimCandidate[] => {
  const balances = useBalances("owned")

  return useMemo(
    () =>
      balances.each
        .filter(
          (b) =>
            b.token?.type === "substrate-dtao" &&
            b.token.networkId === networkId &&
            b.token.netuid === ROOT_NETUID &&
            !!b.token.hotkey &&
            (!addresses || addresses.some((address) => isAddressEqual(address, b.address)))
        )
        .map((balance) => {
          const token = balance.token as SubDTaoToken
          return {
            id: balance.id,
            token,
            balance,
            claimablePlancks: getDTaoClaimablePlancks(balance.locks),
            target: { networkId, address: balance.address, hotkey: token.hotkey as string },
          }
        })
        .filter((candidate) => candidate.claimablePlancks > 0n)
        .sort((a, b) => (a.claimablePlancks > b.claimablePlancks ? -1 : 1)),
    [balances, networkId, addresses]
  )
}
