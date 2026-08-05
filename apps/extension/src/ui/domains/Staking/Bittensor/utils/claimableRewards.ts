import type { Address } from "@core/types/base"
import { type Balance, CLAIMABLE_REWARDS_LABEL } from "@talismn/balances"
import type { DotNetworkId, SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"

import { ROOT_NETUID } from "./constants"

/** Sum of the balance's claimable root rewards (TAO plancks, marked NAV quote) */
export const getBalanceClaimablePlancks = (balance: Balance): bigint =>
  balance.locks
    .filter((lock) => lock.label === CLAIMABLE_REWARDS_LABEL)
    .reduce((sum, lock) => sum + lock.amount.planck, 0n)

/** Identifies the entitlement to claim: claims are per (account, validator) pair */
export type BittensorClaimTarget = {
  networkId: DotNetworkId
  address: Address
  /** validator whose basket entitlement to claim */
  hotkey: string
}

export type BittensorClaim = {
  id: string
  token: SubDTaoToken
  balance: Balance
  claimablePlancks: bigint
}

/**
 * Root positions whose balance carries claimable basket rewards.
 * Sourced from balances rather than staking positions: the chain keeps basket entitlement
 * after a full unstake, so a claim can have no stake left on its validator.
 */
const getBittensorClaims = (
  balances: Balance[],
  ownedAddresses: string[],
  networkIds: string[]
): BittensorClaim[] =>
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
    .filter((claim) => claim.claimablePlancks > 0n)

/** @see getBittensorClaims */
export const getBiggestBittensorClaim = (
  balances: Balance[],
  ownedAddresses: string[],
  networkIds: string[]
): BittensorClaim | null =>
  getBittensorClaims(balances, ownedAddresses, networkIds).reduce<BittensorClaim | null>(
    (biggest, claim) =>
      !biggest || claim.claimablePlancks > biggest.claimablePlancks ? claim : biggest,
    null
  )

/** The target pair's claim, null once its entitlement is gone (eg claimed from another device) */
export const getBittensorClaim = (
  balances: Balance[],
  ownedAddresses: string[],
  { networkId, address, hotkey }: BittensorClaimTarget
): BittensorClaim | null =>
  getBittensorClaims(balances, ownedAddresses, [networkId]).find(
    (claim) => claim.token.hotkey === hotkey && isAddressEqual(claim.balance.address, address)
  ) ?? null
