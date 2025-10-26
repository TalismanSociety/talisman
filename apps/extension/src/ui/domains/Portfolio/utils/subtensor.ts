import { ALPHA_PRICE_SCALE } from "@talismn/balances"

const calculateAlphaPrice = ({ alphaIn, taoIn }: { alphaIn: number; taoIn: number }): number => {
  return (taoIn * Number(ALPHA_PRICE_SCALE.toString())) / alphaIn
}

const calculateTaoAmountFromAlpha = ({
  alphaPrice,
  alphaStaked,
}: {
  alphaPrice: number
  alphaStaked: number
}) => {
  const expectedAlpha = alphaStaked * alphaPrice

  return expectedAlpha / Number(ALPHA_PRICE_SCALE.toString())
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
