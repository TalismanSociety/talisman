import { BigNumber } from "ethers"
import { formatEther } from "ethers/lib/utils"
import { formatDecimals } from "talisman-utils"

export const formatEtherValue = (value: BigNumber, symbol?: string) => {
  return `${formatDecimals(formatEther(value))}${symbol ? ` ${symbol}` : ""}`
}
