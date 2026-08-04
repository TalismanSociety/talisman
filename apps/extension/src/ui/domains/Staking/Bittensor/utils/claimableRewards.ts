import { type Balance, CLAIMABLE_REWARDS_LABEL } from "@talismn/balances"
import type { SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"

import { ROOT_NETUID } from "./constants"

/** Sum of the balance's claimable root rewards (TAO plancks, marked NAV quote) */
export const getBalanceClaimablePlancks = (balance: Balance): bigint =>
  balance.locks
    .filter((lock) => lock.label === CLAIMABLE_REWARDS_LABEL)
    .reduce((sum, lock) => sum + lock.amount.planck, 0n)

export type BittensorClaimCandidate = {
  id: string
  token: SubDTaoToken
  balance: Balance
  claimablePlancks: bigint
}

/**
 * Root positions whose balance carries claimable basket rewards, biggest claim first.
 * Sourced from balances rather than staking positions: the chain keeps basket entitlement
 * after a full unstake, so a candidate can have no stake left on its validator.
 */
export const getBittensorClaimCandidates = (
  balances: Balance[],
  ownedAddresses: string[],
  networkIds: string[]
): BittensorClaimCandidate[] =>
  balances
    .filter(
      (b) =>
        b.token?.type === "substrate-dtao" &&
        networkIds.includes(b.token.networkId) &&
        b.token.netuid === ROOT_NETUID &&
        !!b.token.hotkey &&
        ownedAddresses.some((address) => isAddressEqual(address, b.address))
    )
    .map((balance) => ({
      id: balance.id,
      token: balance.token as SubDTaoToken,
      balance,
      claimablePlancks: getBalanceClaimablePlancks(balance),
    }))
    .filter((candidate) => candidate.claimablePlancks > 0n)
    .sort((a, b) => (a.claimablePlancks > b.claimablePlancks ? -1 : 1))
