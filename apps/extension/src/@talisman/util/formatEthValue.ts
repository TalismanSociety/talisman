import { BigNumber } from "ethers"
import { formatEther, formatUnits } from "ethers/lib/utils"
import { formatDecimals } from "talisman-utils"

export const formatEtherValue = (value: BigNumber, decimals: number, symbol?: string) => {
  return `${formatDecimals(formatUnits(value, decimals))}${symbol ? ` ${symbol}` : ""}`
}
