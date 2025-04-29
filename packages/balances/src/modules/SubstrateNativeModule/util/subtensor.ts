import type { bittensor } from "@polkadot-api/descriptors"

export type GetStakeInfoForColdkeyParams =
  (typeof bittensor)["descriptors"]["apis"]["StakeInfoRuntimeApi"]["get_stake_info_for_coldkey"][0]
export type GetStakeInfoForColdkeyResult =
  (typeof bittensor)["descriptors"]["apis"]["StakeInfoRuntimeApi"]["get_stake_info_for_coldkey"][1]

export type GetDynamicInfoParams =
  (typeof bittensor)["descriptors"]["apis"]["SubnetInfoRuntimeApi"]["get_dynamic_info"][0]
export type GetDynamicInfoResult =
  (typeof bittensor)["descriptors"]["apis"]["SubnetInfoRuntimeApi"]["get_dynamic_info"][1]

export const SUBTENSOR_ROOT_NETUID = 0
export const SUBTENSOR_MIN_STAKE_AMOUNT_PLANK = 1000000n
const TAO_DECIMALS = 9n
export const SCALE_FACTOR = 10n ** TAO_DECIMALS // Equivalent to 10e9 for precision
export const ONE_ALPHA_TOKEN = SCALE_FACTOR

export const calculateAlphaPrice = ({
  dynamicInfo,
}: {
  dynamicInfo: GetDynamicInfoResult | null | undefined
}): bigint => {
  if (!dynamicInfo) return 0n

  const { alpha_in, tao_in } = dynamicInfo

  // Scale taoIn before division to preserve precision
  const result = (tao_in * SCALE_FACTOR) / alpha_in

  return result // Scaled price as bigint
}

export const calculateTaoAmountFromAlpha = ({
  alphaPrice,
  alphaStaked,
}: {
  alphaPrice: bigint
  alphaStaked: bigint
}): bigint => {
  if (!alphaStaked || !alphaPrice) return 0n
  const expectedAlpha = alphaStaked * alphaPrice

  return expectedAlpha / SCALE_FACTOR
}

export const calculateTaoFromDynamicInfo = ({
  dynamicInfo,
  alphaStaked,
}: {
  dynamicInfo: GetDynamicInfoResult | null | undefined
  alphaStaked: bigint
}): bigint => {
  const alphaPrice = calculateAlphaPrice({ dynamicInfo })

  return calculateTaoAmountFromAlpha({ alphaPrice, alphaStaked })
}
