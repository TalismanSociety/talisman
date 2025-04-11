import { SCALE_FACTOR } from "@talismn/balances/src/modules/SubstrateNativeModule/util/subtensor"

const calculateAlphaPrice = ({ alphaIn, taoIn }: { alphaIn: number; taoIn: number }): number => {
  return (taoIn * Number(SCALE_FACTOR.toString())) / alphaIn
}

const calculateTaoAmountFromAlpha = ({
  alphaPrice,
  alphaStaked,
}: {
  alphaPrice: number
  alphaStaked: number
}) => {
  const expectedAlpha = alphaStaked * alphaPrice

  return expectedAlpha / Number(SCALE_FACTOR.toString())
}

export const calculateTaoFromAlphaStaked = ({
  alphaIn,
  taoIn,
  alphaStaked,
}: {
  alphaIn: number
  taoIn: number
  alphaStaked: number
}) => {
  if (!alphaStaked || !alphaIn || !taoIn) return 0

  const alphaPrice = calculateAlphaPrice({ alphaIn, taoIn })

  return calculateTaoAmountFromAlpha({ alphaPrice, alphaStaked })
}
