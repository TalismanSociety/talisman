import { Balance, BalanceFormatter, evmErc20TokenId } from "@talismn/balances"
import { useTokenRatesMap } from "@ui/hooks/useTokenRatesMap"

export const useUniswapV2BalancePair = (balance: Balance) => {
  const tokenRates = useTokenRatesMap()

  const token = balance.token
  if (token?.type !== "evm-uniswapv2") return null
  if (!balance.evmNetworkId) return null

  // NOTE: We want to use the symbols & decimals from the contract,
  // But the contract doesn't provide logos, so we'll try to get the logos from the local db
  const tokenId0 = evmErc20TokenId(balance.evmNetworkId, token.tokenAddress0)
  const tokenId1 = evmErc20TokenId(balance.evmNetworkId, token.tokenAddress1)

  const extra = balance.extra
  const extras = Array.isArray(extra) ? extra : extra !== undefined ? [extra] : []
  const holding0 = extras.find((extra) => extra.label === "holding0")?.amount ?? "0"
  const holding1 = extras.find((extra) => extra.label === "holding1")?.amount ?? "0"

  const holdingBalance0 = new BalanceFormatter(holding0, token.decimals0, tokenRates[tokenId0])
  const holdingBalance1 = new BalanceFormatter(holding1, token.decimals1, tokenRates[tokenId1])
  return [
    { tokenId: tokenId0, symbol: token.symbol0, holdingBalance: holdingBalance0 },
    { tokenId: tokenId1, symbol: token.symbol1, holdingBalance: holdingBalance1 },
  ]
}
