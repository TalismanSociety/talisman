import { subDTaoTokenId } from "@talismn/chaindata-provider"

import type { SubDTaoBalance } from "./types"

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
    if (claimableRate === 0n) {
      continue
    }
    // Calculate claimable = claimable_rate * root_stake
    // Note: claimableRate is a I96F32, a fixed-point number format

    // Multiply claimable_rate by root_stake
    // I96F32 multiplication: round((a * b) / 2^32)
    const totalClaimable = (stake * claimableRate + (1n << 31n)) >> 32n

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
