import { subDTaoTokenId } from "@talismn/chaindata-provider"

import type { SubDTaoBalance } from "./types"

// claimableRate is a I96F32, a fixed-point number format: round((stake * rate) / 2^32)
export const calculateTotalRootClaimable = (stake: bigint, claimableRate: bigint): bigint =>
  (stake * claimableRate + (1n << 31n)) >> 32n

export const calculatePendingRootClaimable = ({
  stake,
  hotkey,
  address,
  networkId,
  validatorRootClaimableRate,
  alreadyClaimedByNetuid,
}: {
  stake: bigint
  hotkey: string
  address: string
  networkId: string
  validatorRootClaimableRate: Map<number, bigint>
  alreadyClaimedByNetuid: Map<number, bigint>
}): SubDTaoBalance[] => {
  const pendingRootClaimBalances: SubDTaoBalance[] = []

  for (const [netuid, claimableRate] of validatorRootClaimableRate) {
    if (claimableRate === 0n) continue

    const totalClaimable = calculateTotalRootClaimable(stake, claimableRate)

    // a zero total is a provably-zero pending claim: skip it so no balance (nor
    // dynamic token downstream) is built for the position
    if (totalClaimable === 0n) continue

    // Subtract already claimed amount to get net pending claimable
    const alreadyClaimed = alreadyClaimedByNetuid.get(netuid) ?? 0n
    const pendingRootClaim = totalClaimable > alreadyClaimed ? totalClaimable - alreadyClaimed : 0n

    pendingRootClaimBalances.push({
      address,
      tokenId: subDTaoTokenId(networkId, netuid, hotkey),
      baseTokenId: subDTaoTokenId(networkId, netuid),
      hotkey: hotkey,
      netuid: netuid,
      pendingRootClaim,
      stake: 0n,
    })
  }

  return pendingRootClaimBalances
}
