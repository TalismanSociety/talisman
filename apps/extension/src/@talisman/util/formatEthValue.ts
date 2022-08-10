import { formatDecimals } from "@talismn/util"
import { BigNumber } from "ethers"
import { formatEther } from "ethers/lib/utils"

export const formatEtherValue = (value: BigNumber, symbol?: string) => {
  return `${formatDecimals(formatEther(value))}${symbol ? ` ${symbol}` : ""}`
}
