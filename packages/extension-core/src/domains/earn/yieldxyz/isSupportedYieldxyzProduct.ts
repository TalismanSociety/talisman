import { YieldDto, YieldType } from "@yieldxyz/sdk"

export const isSupportedYieldxyzProduct = (product: YieldDto): boolean => {
  if (!isSupportedType(product.mechanics.type)) return false

  if (!isSupportedInputToken(product)) return false

  return true
}

const isSupportedInputToken = (product: YieldDto): boolean => {
  if (product.inputTokens.length > 1) {
    // allow multi asset input only if only one can be supplied
    if (!product.mechanics.arguments?.enter?.fields.some((f) => f.name === "inputToken"))
      return false

    // also only allow if the input token can be a native token
    if (!product.inputTokens.some((t) => !t.address)) return false
  }

  return true
}

const isSupportedType = (type: YieldType): boolean => {
  switch (type) {
    case "fixed_yield":
    case "lending":
    case "restaking":
    case "staking":
    case "vault":
      return true

    // case "liquidity_pool": // multi asset input (typing missing somehow)
    // case "concentrated_liquidity_pool": // multi asset input (typing missing somehow)
    case "real_world_asset": // havent seen any yet, need to test
    default:
      return false
  }
}
