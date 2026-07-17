import { bind } from "@react-rxjs/core"
import { type Balance, Balances } from "@talismn/balances"
import type { TokenRateCurrency } from "@talismn/token-rates"
import {
  getSettingValue$,
  selectedCurrency$,
  useSelectedCurrency,
  useSetting,
} from "@ui/state/settings"
import { useMemo } from "react"
import { combineLatest, map } from "rxjs"

import { portfolioDisplayBalances$ } from "../useDisplayBalances"

type SymbolBalances = [string, Balances]

const sortSymbolBalancesByName = ([aSymbol]: SymbolBalances, [bSymbol]: SymbolBalances): number => {
  return aSymbol.localeCompare(bSymbol)
}

const groupBalancesBySymbol = (balances: Balances) => {
  return balances.each.reduce<Record<string, Balance[]>>((acc, b) => {
    if (!b.token) return acc

    const token = b.token
    // this symbol is used for sorting tokens alphabetically
    // for alpha tokens we want the name instead of the symbol
    const symbol =
      token.type === "substrate-dtao" && token.netuid ? (token.name ?? token.symbol) : token.symbol

    const key = b.network?.isTestnet ? `${symbol}__testnet` : symbol
    if (!acc[key]) acc[key] = []
    acc[key].push(b)

    return acc
  }, {})
}

type SymbolSortKey = {
  fiat: number
  hasBalance: boolean
  hasFiatRate: boolean
  hasCoingeckoId: boolean
  isTestnet: boolean
}

const SORT_FIELD = { total: "total", available: "transferable", locked: "unavailable" } as const

/**
 * Sorts symbol groups by fiat value, then a chain of tie-breakers. The sort key of
 * each group is computed once in a single pass over its balances — the comparator
 * itself only reads scalars, where it used to re-reduce fiat sums and re-scan the
 * group ~8 times per compared pair.
 */
const sortSymbolBalancesBy = (
  entries: SymbolBalances[],
  type: "total" | "available" | "locked",
  currency: TokenRateCurrency
): SymbolBalances[] => {
  const field = SORT_FIELD[type]

  const keys = new Map<string, SymbolSortKey>()
  for (const [symbol, balances] of entries) {
    const each = balances.each

    // fiat sum excludes mirror tokens, matching balances.sum.fiat(currency)
    const tokenIds = new Set<string>()
    for (const b of each) if (b.tokenId) tokenIds.add(b.tokenId)

    const key: SymbolSortKey = {
      fiat: 0,
      hasBalance: false,
      hasFiatRate: false,
      hasCoingeckoId: false,
      isTestnet: false,
    }
    for (const b of each) {
      const formatter = b[field]
      if (!key.hasBalance && formatter.planck > 0n) key.hasBalance = true
      const fiat = formatter.fiat(currency)
      // zero-balance tokens with a coingeckoId (and therefore a non-null fiat amount)
      // rank above zero-balance tokens without one
      if (!key.hasFiatRate && fiat !== null) key.hasFiatRate = true
      // `Preview Only` coingeckoIds have no conversion rate (null fiat) but still rank
      // above tokens without a coingeckoId — this groups `$0.00` tokens above `-` tokens.
      // Testnet tokens with a coingeckoId are ignored: they sort last anyway and their
      // conversion rates are never fetched
      if (!key.hasCoingeckoId && typeof b.token?.coingeckoId === "string" && !b.network?.isTestnet)
        key.hasCoingeckoId = true
      if (!key.isTestnet && b.network?.isTestnet) key.isTestnet = true

      const mirrorOf = b.token?.mirrorOf
      if (!mirrorOf || !tokenIds.has(mirrorOf)) key.fiat += fiat ?? 0
    }
    keys.set(symbol, key)
  }

  return [...entries].sort(([aSymbol], [bSymbol]) => {
    const a = keys.get(aSymbol) as SymbolSortKey
    const b = keys.get(bSymbol) as SymbolSortKey

    // sort by fiat balance
    if (a.fiat > b.fiat) return -1
    if (a.fiat < b.fiat) return 1

    // sort by "has a balance or not" (values don't matter)
    if (a.hasBalance !== b.hasBalance) return a.hasBalance ? -1 : 1

    if (a.hasFiatRate !== b.hasFiatRate) return a.hasFiatRate ? -1 : 1

    if (a.hasCoingeckoId !== b.hasCoingeckoId) return a.hasCoingeckoId ? -1 : 1

    // sort testnets below other tokens
    if (a.isTestnet !== b.isTestnet) return a.isTestnet ? 1 : -1

    // polkadot and kusama should appear first
    if (aSymbol.toLowerCase() === "dot") return -1
    if (bSymbol.toLowerCase() === "dot") return 1
    if (aSymbol.toLowerCase() === "ksm") return -1
    if (bSymbol.toLowerCase() === "ksm") return 1

    // sort alphabetically by token symbol
    return aSymbol.localeCompare(bSymbol)
  })
}

const [usePortfolioSymbolBalancesByFilter, _getPortfolioSymbolBalancesByFilter$] = bind(
  (filter: "all" | "network" | "search") =>
    combineLatest([
      selectedCurrency$,
      getSettingValue$("hideDust"),
      getSettingValue$("tokensSortBy"),
      portfolioDisplayBalances$(filter),
    ]).pipe(
      map(([currency, hideDust, tokensSortBy, balances]) => {
        // group balances by token symbol
        // TODO: Move the association between a token on multiple chains into the backend / subsquid.
        // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
        const groupedByToken = groupBalancesBySymbol(balances)

        const grouped = Object.entries(groupedByToken).map(
          ([key, tokenBalances]): SymbolBalances => [key, new Balances(tokenBalances)]
        )

        const symbolBalances = (
          tokensSortBy === "name"
            ? [...grouped].sort(sortSymbolBalancesByName)
            : sortSymbolBalancesBy(grouped, tokensSortBy, currency)
        ).filter(
          hideDust
            ? ([, balances]) =>
                balances.each.flatMap((b) => b.token?.coingeckoId ?? []).length === 0 ||
                balances.sum.fiat("usd").total >= 1
            : () => true
        )

        const available = sortSymbolBalancesBy(
          symbolBalances
            .map(([symbol, balances]): [string, Balances] => [
              symbol,
              balances.find((b) => b.transferable.planck > 0n),
            ])
            .filter(([, balances]) => balances.count > 0),
          "available",
          currency
        )

        // only show zero balances in the popup when the selected account(s) have balances
        const availableSymbolBalances =
          available.length > 0
            ? available
            : sortSymbolBalancesBy(
                symbolBalances
                  .map(([symbol, balances]): [string, Balances] => [
                    symbol,
                    balances.find((b) => b.total.planck === 0n),
                  ])
                  .filter(([, balances]) => balances.count > 0),
                "available",
                currency
              )

        const lockedSymbolBalances = sortSymbolBalancesBy(
          symbolBalances
            .map(([symbol, balances]): [string, Balances] => [
              symbol,
              balances.find((b) => b.unavailable.planck > 0n),
            ])
            .filter(([, balances]) => balances.count > 0),
          "locked",
          currency
        )

        return { symbolBalances, availableSymbolBalances, lockedSymbolBalances }
      })
    ),
  {
    symbolBalances: [],
    availableSymbolBalances: [],
    lockedSymbolBalances: [],
  }
)

export { usePortfolioSymbolBalancesByFilter }

const _usePortfolioSymbolBalances = (balances: Balances) => {
  const currency = useSelectedCurrency()
  const [hideDust] = useSetting("hideDust")

  // group balances by token symbol
  // TODO: Move the association between a token on multiple chains into the backend / subsquid.
  // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
  const symbolBalances: SymbolBalances[] = useMemo(() => {
    const groupedByToken = groupBalancesBySymbol(balances)

    return sortSymbolBalancesBy(
      Object.entries(groupedByToken).map(
        ([key, tokenBalances]): SymbolBalances => [key, new Balances(tokenBalances)]
      ),
      "total",
      currency
    ).filter(
      hideDust
        ? ([, balances]) =>
            balances.each.flatMap((b) => b.token?.coingeckoId ?? []).length === 0 ||
            balances.sum.fiat("usd").total >= 1
        : () => true
    )
  }, [balances, currency, hideDust])

  const availableSymbolBalances = useMemo(() => {
    const available = sortSymbolBalancesBy(
      symbolBalances
        .map(([symbol, balances]): [string, Balances] => [
          symbol,
          balances.find((b) => b.transferable.planck > 0n),
        ])
        .filter(([, balances]) => balances.count > 0),
      "available",
      currency
    )

    // only show zero balances in the popup when the selected account(s) have balances
    if (available.length > 0) return available

    return sortSymbolBalancesBy(
      symbolBalances
        .map(([symbol, balances]): [string, Balances] => [
          symbol,
          balances.find((b) => b.total.planck === 0n),
        ])
        .filter(([, balances]) => balances.count > 0),
      "available",
      currency
    )
  }, [currency, symbolBalances])

  const lockedSymbolBalances = useMemo(
    () =>
      sortSymbolBalancesBy(
        symbolBalances
          .map(([symbol, balances]): [string, Balances] => [
            symbol,
            balances.find((b) => b.unavailable.planck > 0n),
          ])
          .filter(([, balances]) => balances.count > 0),
        "locked",
        currency
      ),
    [currency, symbolBalances]
  )

  return { symbolBalances, availableSymbolBalances, lockedSymbolBalances }
}
