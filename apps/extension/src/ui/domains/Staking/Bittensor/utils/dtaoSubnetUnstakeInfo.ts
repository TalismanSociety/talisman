import {
  type Balances,
  type DTaoConvictionLockInfo,
  findDTaoConvictionLock,
} from "@talismn/balances"
import { isAddressEqual } from "@talismn/crypto"

export type DTaoSubnetUnstakeInfo = {
  /** Σ of the coldkey's staking positions on the subnet */
  stakedTotal: bigint
  /** the subnet's conviction lock, reported on the base (hotkey-less) token balance */
  convictionLock: DTaoConvictionLockInfo | null
  /** stakedTotal - conviction lock: the on-chain available_to_unstake amount */
  available: bigint
}

/**
 * Computes the subnet-wide available-to-unstake amount for a coldkey.
 *
 * On-chain, a conviction lock constrains the coldkey's TOTAL alpha on the subnet
 * (available_to_unstake = Σ stakes - locked_mass), not a specific staking position:
 * the amount that can be unstaked/transferred from a position is
 * min(position stake, subnet available).
 */
export const getDTaoSubnetUnstakeInfo = (
  balances: Balances,
  address: string,
  networkId: string,
  netuid: number
): DTaoSubnetUnstakeInfo => {
  const subnetBalances = balances.each.filter(
    (b) =>
      b.token?.type === "substrate-dtao" &&
      b.token.networkId === networkId &&
      b.token.netuid === netuid &&
      isAddressEqual(b.address, address)
  )

  const stakedTotal = subnetBalances.reduce((sum, b) => sum + b.free.planck, 0n)
  const convictionLock =
    subnetBalances.map((b) => findDTaoConvictionLock(b.locks)).find((lock) => !!lock) ?? null

  const locked = convictionLock?.amount ?? 0n
  const available = stakedTotal > locked ? stakedTotal - locked : 0n

  return { stakedTotal, convictionLock, available }
}

/**
 * Conservative locked amount when a freshly read on-chain lock is available alongside the cached one.
 *
 * A lock can only constrain unstaking MORE than the cached balance suggests (it grows via owner
 * auto-lock or a concurrent top-up between balance polls), so guard with the larger of the two.
 * A fresh value lower than cached is ignored: trusting it could briefly over-allow an unstake that
 * then reverts, and it would make the input flicker as the two sources converge.
 */
export const effectiveLockedAmount = (cached: bigint, fresh: bigint | null | undefined): bigint =>
  typeof fresh === "bigint" && fresh > cached ? fresh : cached
