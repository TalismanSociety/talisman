import {
  evmNativeTokenId,
  solNativeTokenId,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { usePortfolioSymbolBalancesByFilter } from "@ui/domains/Portfolio/AssetsTable/usePortfolioSymbolBalances"
import { useTokensMap } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { useMemo } from "react"

export type AModeTickerItem = {
  tokenId: TokenId
  symbol: string
  price: number
  /** percent, as the rates store gives it */
  change24h: number | null
}

const MAX_ITEMS = 10

/** shown when the wallet holds nothing priced */
const MAJOR_TOKEN_IDS: TokenId[] = [
  evmNativeTokenId("1"),
  subNativeTokenId("polkadot"),
  subNativeTokenId("bittensor"),
  solNativeTokenId("solana-mainnet"),
  subNativeTokenId("kusama"),
]

/** prices of the tokens the user holds, by fiat value, or of a few major tokens */
export const useAModeTicker = (): { items: AModeTickerItem[]; isHoldings: boolean } => {
  const { symbolBalances } = usePortfolioSymbolBalancesByFilter("all")
  const ratesMap = useTokenRatesMap()
  const tokensMap = useTokensMap()
  const currency = useSelectedCurrency()

  return useMemo(() => {
    const held = symbolBalances
      .map(([, balances]) => {
        const priced = balances.each.find(
          (b) => b.total.planck > 0n && !b.network?.isTestnet && !!b.rates?.[currency]
        )
        const rate = priced?.rates?.[currency]
        if (!priced?.token || !rate) return null
        return {
          tokenId: priced.tokenId,
          symbol: priced.token.symbol,
          price: rate.price,
          change24h: rate.change24h ?? null,
        }
      })
      .filter(isNotNil)
      .slice(0, MAX_ITEMS)

    if (held.length) return { items: held, isHoldings: true }

    const majors = MAJOR_TOKEN_IDS.map((tokenId) => {
      const token = tokensMap[tokenId]
      const rate = ratesMap[tokenId]?.[currency]
      if (!token || !rate) return null
      return { tokenId, symbol: token.symbol, price: rate.price, change24h: rate.change24h ?? null }
    }).filter(isNotNil)

    return { items: majors, isHoldings: false }
  }, [symbolBalances, ratesMap, tokensMap, currency])
}
