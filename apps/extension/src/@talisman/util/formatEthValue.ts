import { BigNumber, BigNumberish } from "ethers"
import { formatUnits } from "ethers/lib/utils"
import { formatDecimals } from "talisman-utils"

export const formatEtherValue = (value: BigNumberish, decimals: number, symbol?: string) => {
  return `${formatDecimals(formatUnits(BigNumber.from(value), decimals))}${
    symbol ? ` ${symbol}` : ""
  }`
}
