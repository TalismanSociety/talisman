import { Balances } from "@talismn/balances"
import { Chain, Token } from "@talismn/chaindata-provider"
import { TokenRatesList } from "@talismn/token-rates"
import BigNumber from "bignumber.js"
import { useMemo } from "react"

import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"

export type BalanceSummary = {
  totalTokens: BigNumber
  totalFiat: number | null
  lockedTokens: BigNumber
  lockedFiat: number | null
  availableTokens: BigNumber
  availableFiat: number | null
}

const DEFAULT_SUMMARY: BalanceSummary = {
  totalTokens: BigNumber(0),
  totalFiat: null,
  lockedTokens: BigNumber(0),
  lockedFiat: null,
  availableTokens: BigNumber(0),
  availableFiat: null,
}

// This assumes that all balances are for the same token (or clones, such as DOT + xcDOT)
const getBestTokenForSymbol = (balances: Balances, tokens?: Token[], chains?: Chain[]) => {
  const tokenIds = balances.each.map((t) => t.tokenId)
  const matches = tokens?.filter((t) => tokenIds.includes(t.id))

  return (
    // priority to token from a relay chain
    // mainnet relay native
    matches?.find(
      (t) =>
        !t.isTestnet &&
        ["substrate-native", "evm-native"].includes(t.type) &&
        chains?.find((c) => !c.relay && c.id === t.chain?.id)
    ) ??
    // mainnet solo/para native
    matches?.find((t) => !t.isTestnet && ["substrate-native", "evm-native"].includes(t.type)) ??
    // mainnet which has an image
    matches?.find((t) => !t.isTestnet && t.logo) ??
    // testnet relay
    matches?.find(
      (t) =>
        t.isTestnet &&
        ["substrate-native", "evm-native"].includes(t.type) &&
        chains?.find((c) => !c.relay && c.id === t.chain?.id)
    ) ??
    // testnet solo/para native
    matches?.find((t) => t.isTestnet && ["substrate-native", "evm-native"].includes(t.type)) ??
    // testnet which has an image
    matches?.find((t) => t.isTestnet && t.logo) ??
    // fallback
    matches?.[0]
  )
}

export const useTokenBalancesSummary = (balances: Balances) => {
  const tokenBalances = useMemo(() => balances.filterMirrorTokens(), [balances])
  const { tokens, chains } = usePortfolio()
  // find the most appropriate token (for the icon)
  const token = useMemo(
    () => getBestTokenForSymbol(tokenBalances, tokens, chains),
    [chains, tokenBalances, tokens]
  )
  const currency = useSelectedCurrency()

  const tokenBalanceRates = useMemo(
    () =>
      tokenBalances.each.reduce<TokenRatesList>((tokenBalanceRates, balance) => {
        if (balance.rates) tokenBalanceRates[balance.tokenId] = balance.rates
        return tokenBalanceRates
      }, {}),
    [tokenBalances]
  )

  const summary = useMemo(() => {
    if (tokenBalances.count < 1) return DEFAULT_SUMMARY

    const fiatDefaultValue = tokenBalances.each.some(
      (b) => b.token && tokenBalanceRates[b.token.id]
    )
      ? 0
      : null

    // sum is only available for fiat, so we sum ourselves both tokens & fiat
    const summary = tokenBalances.each.reduce<BalanceSummary>(
      (
        { totalTokens, totalFiat, lockedTokens, lockedFiat, availableTokens, availableFiat },
        b
      ) => ({
        totalTokens: totalTokens.plus(b.total.tokens),
        totalFiat:
          b.token && tokenBalanceRates[b.token.id]
            ? (totalFiat ?? 0) + (b.total.fiat(currency) ?? 0)
            : totalFiat,
        lockedTokens: lockedTokens.plus(b.unavailable.tokens),
        lockedFiat:
          b.token && tokenBalanceRates[b.token.id]
            ? (lockedFiat ?? 0) + (b.unavailable.fiat(currency) ?? 0)
            : lockedFiat,
        availableTokens: availableTokens.plus(b.transferable.tokens),
        availableFiat:
          b.token && tokenBalanceRates[b.token.id]
            ? (availableFiat ?? 0) + (b.transferable.fiat(currency) ?? 0)
            : availableFiat,
      }),
      {
        totalTokens: BigNumber(0),
        totalFiat: fiatDefaultValue,
        lockedTokens: BigNumber(0),
        lockedFiat: fiatDefaultValue,
        availableTokens: BigNumber(0),
        availableFiat: fiatDefaultValue,
      }
    )

    return summary
  }, [currency, tokenBalanceRates, tokenBalances.count, tokenBalances.each])

  return {
    token,
    rate: token?.id !== undefined ? tokenBalanceRates[token?.id]?.[currency] : undefined,
    summary,
    tokenBalances,
    tokenBalanceRates,
  }
}
