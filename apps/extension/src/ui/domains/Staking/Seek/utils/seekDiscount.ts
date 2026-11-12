import { log } from "@common/log"
import type { RemoteConfigStoreData } from "@core/domains/app/types"
import type { PublicClient } from "viem"

import seekSinglePoolStakingAbi from "../seekSinglePoolStakingAbi"

/** SEEK each holder has staked, 0 for a holder whose read fails */
export const readSeekStaked = (
  client: PublicClient,
  contract: string,
  holders: readonly `0x${string}`[]
): Promise<bigint[]> =>
  Promise.all(
    holders.map(async (holder) => {
      try {
        return await client.readContract({
          address: contract as `0x${string}`,
          abi: seekSinglePoolStakingAbi,
          functionName: "balanceOf",
          args: [holder],
        })
      } catch (error) {
        log.error(`Failed to fetch balance for ${holder}:`, error)
        return 0n
      }
    })
  )

type SeekDiscountTier = { tier: number; min: bigint; discount: number }

const NO_DISCOUNT: SeekDiscountTier = { tier: 0, min: 0n, discount: 0 }

/** The discount tier a wallet earns. totalStaked is null while it is unknown: the lowest tier applies */
export const getSeekDiscountTier = (
  totalStaked: bigint | null,
  tiers: RemoteConfigStoreData["seek"]["discountTiers"],
  isEnabled: boolean
): SeekDiscountTier => {
  if (!isEnabled) return NO_DISCOUNT

  const discountTiers = tiers.map((tier) => ({ ...tier, min: BigInt(tier.min) }))
  const lowestTier = discountTiers[0] ?? NO_DISCOUNT
  if (totalStaked === null) return lowestTier

  return discountTiers.findLast((tier) => totalStaked >= tier.min) ?? lowestTier
}
