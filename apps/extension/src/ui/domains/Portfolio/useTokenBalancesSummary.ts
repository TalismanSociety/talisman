import { Balances } from "@talismn/balances"
import { isNetworkDot, Network, Token } from "@talismn/chaindata-provider"
import { TokenRatesList } from "@talismn/token-rates"
import BigNumber from "bignumber.js"

import "extension-core"

import { isNotNil } from "@talismn/util"
import { uniq } from "lodash-es"
import { useMemo } from "react"

import { useNetworksMapById, useSelectedCurrency, useTokensMap } from "@ui/state"

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

const isRelayDotNetwork = (network: Network) =>
  isNetworkDot(network) && network.topology.type === "relay"

// This assumes that all balances are for the same token (or clones, such as DOT + xcDOT)
const useBestTokenForSymbol = (balances: Balances) => {
  const tokensById = useTokensMap()
  const networksById = useNetworksMapById()
  const currency = useSelectedCurrency()

  return useMemo(() => {
    // use best token by market cap, if any
    const balancesByMarketCap = balances.each
      .filter((b) => !!b.rates?.[currency]?.marketCap)
      .sort((a, b) => (b.rates?.[currency]?.marketCap ?? 0) - (a.rates?.[currency]?.marketCap ?? 0))

    if (balancesByMarketCap.length) {
      const token = tokensById[balancesByMarketCap[0].tokenId]
      if (token) return token
    }

    const matches = uniq(balances.each.map((t) => t.tokenId))
      .map((id) => tokensById[id])
      .filter(isNotNil)

    const isTestnet = (token: Token) => !!networksById[token.networkId]?.isTestnet

    if (matches.length === 1) return matches[0]

    return (
      // priority to token from a relay chain
      // mainnet relay native
      matches?.find((t) => !isTestnet(t) && isRelayDotNetwork(networksById[t.networkId])) ??
      // mainnet solo/para native
      matches?.find((t) => !isTestnet(t) && ["substrate-native", "evm-native"].includes(t.type)) ??
      // mainnet which has an image
      matches?.find((t) => !isTestnet(t) && t.logo) ??
      // testnet relay
      matches?.find(
        (t) =>
          isTestnet(t) &&
          ["substrate-native", "evm-native"].includes(t.type) &&
          isRelayDotNetwork(networksById[t.networkId]),
      ) ??
      // testnet solo/para native
      matches?.find((t) => isTestnet(t) && ["substrate-native", "evm-native"].includes(t.type)) ??
      // testnet which has an image
      matches?.find((t) => isTestnet(t) && t.logo) ??
      // fallback
      matches?.[0]
    )
  }, [balances.each, currency, tokensById, networksById])
}

export const useTokenBalancesSummary = (balances: Balances) => {
  const tokenBalances = useMemo(() => balances.filterMirrorTokens(), [balances])
  const token = useBestTokenForSymbol(tokenBalances)
  const currency = useSelectedCurrency()

  const tokenBalanceRates = useMemo(
    () =>
      tokenBalances.each.reduce<TokenRatesList>((tokenBalanceRates, balance) => {
        if (balance.rates) tokenBalanceRates[balance.tokenId] = balance.rates
        return tokenBalanceRates
      }, {}),
    [tokenBalances],
  )

  const summary = useMemo(() => {
    if (tokenBalances.count < 1) return DEFAULT_SUMMARY

    const fiatDefaultValue = tokenBalances.each.some(
      (b) => b.token && tokenBalanceRates[b.token.id],
    )
      ? 0
      : null

    // sum is only available for fiat, so we sum ourselves both tokens & fiat
    const summary = tokenBalances.each.reduce<BalanceSummary>(
      (
        { totalTokens, totalFiat, lockedTokens, lockedFiat, availableTokens, availableFiat },
        b,
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
      },
    )

    return summary
  }, [currency, tokenBalanceRates, tokenBalances])

  return {
    token,
    rate: token?.id !== undefined ? tokenBalanceRates[token?.id]?.[currency] : undefined,
    summary,
    tokenBalances,
    tokenBalanceRates,
  }
}
