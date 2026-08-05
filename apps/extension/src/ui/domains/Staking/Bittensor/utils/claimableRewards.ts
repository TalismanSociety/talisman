import type { Address } from "@core/types/base"
import { type Balance, CLAIMABLE_REWARDS_LABEL } from "@talismn/balances"
import type { DotNetworkId } from "@talismn/chaindata-provider"
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

/**
 * The target pair's claimable rewards, null once its entitlement is gone (eg claimed elsewhere).
 * Sourced from balances rather than staking positions: the chain keeps basket entitlement
 * after a full unstake, so a claim can have no stake left on its validator.
 */
export const getBittensorClaimablePlancks = (
  balances: Balance[],
  { networkId, address, hotkey }: BittensorClaimTarget
): bigint | null => {
  const balance = balances.find(
    (b) =>
      b.token?.type === "substrate-dtao" &&
      b.token.networkId === networkId &&
      b.token.netuid === ROOT_NETUID &&
      b.token.hotkey === hotkey &&
      isAddressEqual(b.address, address)
  )

  const claimablePlancks = balance ? getBalanceClaimablePlancks(balance) : 0n

  return claimablePlancks > 0n ? claimablePlancks : null
}
