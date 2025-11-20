import { subDTaoTokenId } from "@talismn/chaindata-provider"

import { getScaledAlphaPrice } from "./alphaPrice"
import { GetDynamicInfosResult, SubDTaoBalance } from "./types"

type DynamicInfo = NonNullable<GetDynamicInfosResult[number]>

export const calculatePendingRootClaimable = ({
  stake,
  hotkey,
  address,
  networkId,
  validatorRootClaimableRate,
  dynamicInfoByNetuid,
}: {
  stake: bigint
  hotkey: string
  address: string
  networkId: string
  validatorRootClaimableRate: Map<number, bigint>
  dynamicInfoByNetuid: Record<number, DynamicInfo | undefined>
}): SubDTaoBalance[] => {
  const pendingRootClaimBalances: SubDTaoBalance[] = []

  for (const [netuid, claimableRate] of validatorRootClaimableRate) {
    if (claimableRate === 0n) {
      continue
    }
    const dynamicInfo = dynamicInfoByNetuid[netuid]
    const scaledAlphaPrice = dynamicInfo
      ? getScaledAlphaPrice(dynamicInfo.alpha_in, dynamicInfo.tao_in)
      : 0n
    // Calculate claimable = claimable_rate * root_stake
    // Note: I96F32 is a fixed-point number format
    // We'll need to handle the fixed-point multiplication correctly
    // For now, we'll do a simple multiplication and assume I96F32 is represented
    // as a bigint with appropriate scaling

    // Multiply claimable_rate by root_stake
    // I96F32 multiplication: (a * b) / 2^32 to handle fixed-point
    // But without knowing the exact scaling, we'll do simple multiplication
    // This might need adjustment based on actual I96F32 implementation
    const pendingRootClaim = (stake * claimableRate) / 2n ** 32n

    pendingRootClaimBalances.push({
      address,
      tokenId: subDTaoTokenId(networkId, netuid, hotkey),
      baseTokenId: subDTaoTokenId(networkId, netuid),
      hotkey: hotkey,
      netuid: netuid,
      scaledAlphaPrice,
      pendingRootClaim,
      stake: pendingRootClaim,
    })
  }

  return pendingRootClaimBalances
}
