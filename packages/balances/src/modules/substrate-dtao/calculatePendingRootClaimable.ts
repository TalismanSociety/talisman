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
    // Note: claimableRate is a I96F32, a fixed-point number format

    // Multiply claimable_rate by root_stake
    // I96F32 multiplication: round((a * b) / 2^32)
    const pendingRootClaim = (stake * claimableRate + (1n << 31n)) >> 32n

    pendingRootClaimBalances.push({
      address,
      tokenId: subDTaoTokenId(networkId, netuid, hotkey),
      baseTokenId: subDTaoTokenId(networkId, netuid),
      hotkey: hotkey,
      netuid: netuid,
      scaledAlphaPrice,
      pendingRootClaim,
      stake: 0n,
    })
  }

  return pendingRootClaimBalances
}
