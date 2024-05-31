import { Balance, Balances } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import BigNumber from "bignumber.js"
import groupBy from "lodash/groupBy"

export const useUniswapV2LpTokenTotalValueLocked = (
  token?: Token,
  tokenRate?: number | null,
  balances?: Balances
) => {
  if (token?.type !== "evm-uniswapv2") return null

  const byChain = groupBy(balances?.each, (b) => b.chainId)
  const chainTvls = Object.values(byChain).map((chainBalances) =>
    extractTvlFromBalance(
      chainBalances?.find?.((b) => b.isSource("evm-uniswapv2")),
      token,
      tokenRate
    )
  )

  // The *total* value locked across all chains
  // is the sum of the tvl of each chain
  return BigNumber.sum(...chainTvls).toNumber()
}

const extractTvlFromBalance = (balance?: Balance, token?: Token, tokenRate?: number | null) => {
  const extra = balance?.extra
  const extras = Array.isArray(extra) ? extra : extra !== undefined ? [extra] : []
  const totalSupply = BigNumber(
    extras.find((extra) => extra.label === "totalSupply")?.amount ?? "0"
  )
  const totalSupplyTokens = BigNumber(totalSupply).times(Math.pow(10, -1 * (token?.decimals ?? 0)))

  return BigNumber(tokenRate ?? 0).times(totalSupplyTokens)
}
