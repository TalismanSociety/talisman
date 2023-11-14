import { formatDecimals, planckToTokens } from "@talismn/util"

export const formatEthValue = (value: bigint, decimals: number, symbol?: string) => {
  return `${formatDecimals(planckToTokens(value.toString(), decimals))}${
    symbol ? ` ${symbol}` : ""
  }`
}
