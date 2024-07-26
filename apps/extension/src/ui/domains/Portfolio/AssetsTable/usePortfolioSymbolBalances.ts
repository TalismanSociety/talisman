import { FiatSumBalancesFormatter } from "@talismn/balances"
import { TokenRateCurrency } from "@talismn/token-rates"
import { atom, useAtomValue } from "jotai"
import { atomFamily } from "jotai/utils"
import { useMemo } from "react"

import { Balance, Balances } from "@extension/core"
import { selectedCurrencyAtom, settingsAtom } from "@ui/atoms"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useSetting } from "@ui/hooks/useSettings"

import { portfolioDisplayBalancesAtomFamily } from "../useDisplayBalances"

type SymbolBalances = [string, Balances]

const sortSymbolBalancesByName = ([aSymbol]: SymbolBalances, [bSymbol]: SymbolBalances): number => {
  return aSymbol.localeCompare(bSymbol)
}

const sortSymbolBalancesBy =
  (type: "total" | "available" | "locked", currency: TokenRateCurrency) =>
  ([aSymbol, aBalances]: SymbolBalances, [bSymbol, bBalances]: SymbolBalances): number => {
    const planckAmount = (b: Balance) =>
      type === "total"
        ? b.total.planck
        : type === "available"
        ? b.transferable.planck
        : b.unavailable.planck

    const fiatAmount = (b: FiatSumBalancesFormatter | Balance) => {
      const getAmount = (b: FiatSumBalancesFormatter | Balance, type: keyof typeof b) => {
        if (b instanceof Balance) return b[type].fiat(currency)
        return b[type]
      }

      return type === "total"
        ? getAmount(b, "total")
        : type === "available"
        ? getAmount(b, "transferable")
        : type === "locked"
        ? getAmount(b, "unavailable") !== null
          ? // return unavailable if not null
            getAmount(b, "unavailable") ?? 0
          : // return null if unavailable is null
            null
        : null
    }

    // sort by fiat balance
    const aFiat = fiatAmount(aBalances.sum.fiat(currency)) ?? 0
    const bFiat = fiatAmount(bBalances.sum.fiat(currency)) ?? 0
    if (aFiat > bFiat) return -1
    if (aFiat < bFiat) return 1

    // sort by "has a balance or not" (values don't matter)
    const aHasBalance = !!aBalances.each.find((b) => planckAmount(b) > 0n)
    const bHasBalance = !!bBalances.each.find((b) => planckAmount(b) > 0n)
    if (aHasBalance && !bHasBalance) return -1
    if (!aHasBalance && bHasBalance) return 1

    // sort zero-balance tokens with a coingeckoId (and therefore a non-null fiat amount)
    // above zero-balance tokens without a coingeckoId
    const aHasFiatRate = !!aBalances.each.find((b) => fiatAmount(b) !== null)
    const bHasFiatRate = !!bBalances.each.find((b) => fiatAmount(b) !== null)
    if (aHasFiatRate && !bHasFiatRate) return -1
    if (!aHasFiatRate && bHasFiatRate) return 1

    // sort zero-balance tokens with a `Preview Only` coingeckoId (and therefore no conversion
    // rate, and so a null fiat amount) above zero-balance tokens without a coingeckoId
    // (but ignore testnet tokens with a coingeckoId, they get sorted last and we don't fetch
    // their conversion rates from coingecko anyway)
    //
    // this effectively groups the `$0.00` tokens above the `-` tokens
    const aHasCoingeckoId = !!aBalances.each.find(
      (b) => typeof b.token?.coingeckoId === "string" && !b.token?.isTestnet
    )
    const bHasCoingeckoId = !!bBalances.each.find(
      (b) => typeof b.token?.coingeckoId === "string" && !b.token?.isTestnet
    )
    if (aHasCoingeckoId && !bHasCoingeckoId) return -1
    if (!aHasCoingeckoId && bHasCoingeckoId) return 1

    // sort testnets below other tokens
    const aIsTestnet = !!aBalances.each.find((b) => b.token?.isTestnet)
    const bIsTestnet = !!bBalances.each.find((b) => b.token?.isTestnet)
    if (aIsTestnet && !bIsTestnet) return 1
    if (!aIsTestnet && bIsTestnet) return -1

    // polkadot and kusama should appear first
    if (aSymbol.toLowerCase() === "dot") return -1
    if (bSymbol.toLowerCase() === "dot") return 1
    if (aSymbol.toLowerCase() === "ksm") return -1
    if (bSymbol.toLowerCase() === "ksm") return 1

    // sort alphabetically by token symbol
    return aSymbol.localeCompare(bSymbol)
  }

const portfolioSymbolBalancesAtomFamily = atomFamily((filter: "all" | "network" | "search") =>
  atom(async (get) => {
    const [currency, { hideDust, tokensSortBy }] = await Promise.all([
      get(selectedCurrencyAtom),
      get(settingsAtom),
    ])
    const balances = get(portfolioDisplayBalancesAtomFamily(filter))

    // group balances by token symbol
    // TODO: Move the association between a token on multiple chains into the backend / subsquid.
    // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
    const groupedByToken = balances.each.reduce<Record<string, Balance[]>>((acc, b) => {
      if (!b.token) return acc

      const key = b.token.isTestnet ? `${b.token.symbol}__testnet` : b.token.symbol
      if (!acc[key]) acc[key] = []
      acc[key].push(b)

      return acc
    }, {})

    const sortFn =
      tokensSortBy === "name"
        ? sortSymbolBalancesByName
        : sortSymbolBalancesBy(tokensSortBy, currency)

    const symbolBalances = Object.entries(groupedByToken)
      .map(([key, tokenBalances]): SymbolBalances => [key, new Balances(tokenBalances)])
      .sort(sortFn)
      .filter(
        hideDust
          ? ([, balances]) =>
              balances.each.flatMap((b) => b.token?.coingeckoId ?? []).length === 0 ||
              balances.sum.fiat("usd").total >= 1
          : () => true
      )

    const available = symbolBalances
      .map(([symbol, balances]): [string, Balances] => [
        symbol,
        balances.find((b) => b.transferable.planck > 0n),
      ])
      .filter(([, balances]) => balances.count > 0)
      .sort(sortSymbolBalancesBy("available", currency))

    // only show zero balances in the popup when the selected account(s) have balances
    const availableSymbolBalances =
      available.length > 0
        ? available
        : symbolBalances
            .map(([symbol, balances]): [string, Balances] => [
              symbol,
              balances.find((b) => b.total.planck === 0n),
            ])
            .filter(([, balances]) => balances.count > 0)
            .sort(sortSymbolBalancesBy("available", currency))

    const lockedSymbolBalances = symbolBalances
      .map(([symbol, balances]): [string, Balances] => [
        symbol,
        balances.find((b) => b.unavailable.planck > 0n),
      ])
      .filter(([, balances]) => balances.count > 0)
      .sort(sortSymbolBalancesBy("locked", currency))

    return { symbolBalances, availableSymbolBalances, lockedSymbolBalances }
  })
)

export const usePortfolioSymbolBalancesByFilter = (filter: "all" | "network" | "search") => {
  return useAtomValue(portfolioSymbolBalancesAtomFamily(filter))
}

export const usePortfolioSymbolBalances = (balances: Balances) => {
  const currency = useSelectedCurrency()
  const [hideDust] = useSetting("hideDust")

  // group balances by token symbol
  // TODO: Move the association between a token on multiple chains into the backend / subsquid.
  // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
  const symbolBalances: SymbolBalances[] = useMemo(() => {
    const groupedByToken = balances.each.reduce<Record<string, Balance[]>>((acc, b) => {
      if (!b.token) return acc

      const key = b.token.isTestnet ? `${b.token.symbol}__testnet` : b.token.symbol
      if (!acc[key]) acc[key] = []
      acc[key].push(b)

      return acc
    }, {})

    return Object.entries(groupedByToken)
      .map(([key, tokenBalances]): SymbolBalances => [key, new Balances(tokenBalances)])
      .sort(sortSymbolBalancesBy("total", currency))
      .filter(
        hideDust
          ? ([, balances]) =>
              balances.each.flatMap((b) => b.token?.coingeckoId ?? []).length === 0 ||
              balances.sum.fiat("usd").total >= 1
          : () => true
      )
  }, [balances.each, currency, hideDust])

  const availableSymbolBalances = useMemo(() => {
    const available = symbolBalances
      .map(([symbol, balances]): [string, Balances] => [
        symbol,
        balances.find((b) => b.transferable.planck > 0n),
      ])
      .filter(([, balances]) => balances.count > 0)
      .sort(sortSymbolBalancesBy("available", currency))

    // only show zero balances in the popup when the selected account(s) have balances
    if (available.length > 0) return available

    return symbolBalances
      .map(([symbol, balances]): [string, Balances] => [
        symbol,
        balances.find((b) => b.total.planck === 0n),
      ])
      .filter(([, balances]) => balances.count > 0)
      .sort(sortSymbolBalancesBy("available", currency))
  }, [currency, symbolBalances])

  const lockedSymbolBalances = useMemo(
    () =>
      symbolBalances
        .map(([symbol, balances]): [string, Balances] => [
          symbol,
          balances.find((b) => b.unavailable.planck > 0n),
        ])
        .filter(([, balances]) => balances.count > 0)
        .sort(sortSymbolBalancesBy("locked", currency)),
    [currency, symbolBalances]
  )

  return { symbolBalances, availableSymbolBalances, lockedSymbolBalances }
}
