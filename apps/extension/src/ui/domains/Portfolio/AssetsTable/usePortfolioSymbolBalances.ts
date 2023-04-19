import {
  DEFAULT_PORTFOLIO_TOKENS_ETHEREUM,
  DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE,
} from "@core/constants"
import { Balance, Balances } from "@core/domains/balances/types"
import { FiatSumBalancesFormatter } from "@talismn/balances"
import { useMemo } from "react"

import { usePortfolio } from "../context"
import { useSelectedAccount } from "../SelectedAccountContext"

type SymbolBalances = [string, Balances]
const sortSymbolBalancesBy =
  (type: "total" | "available" | "locked") =>
  ([aSymbol, aBalances]: SymbolBalances, [bSymbol, bBalances]: SymbolBalances): number => {
    const planckAmount = (b: Balance) =>
      type === "total"
        ? b.total.planck
        : type === "available"
        ? b.transferable.planck
        : b.locked.planck + b.reserved.planck

    const fiatAmount = (b: FiatSumBalancesFormatter | Balance) => {
      const getAmount = (b: FiatSumBalancesFormatter | Balance, type: keyof typeof b) => {
        if (b instanceof Balance) return b[type].fiat("usd")
        return b[type]
      }

      return type === "total"
        ? getAmount(b, "total")
        : type === "available"
        ? getAmount(b, "transferable")
        : type === "locked"
        ? getAmount(b, "locked") !== null || getAmount(b, "reserved") !== null
          ? // return locked + reserved if either of them are not null
            (getAmount(b, "locked") ?? 0) + (getAmount(b, "reserved") ?? 0)
          : // return null if both locked and reserved are null
            null
        : null
    }

    // sort by fiat balance
    const aFiat = fiatAmount(aBalances.sum.fiat("usd")) ?? 0
    const bFiat = fiatAmount(bBalances.sum.fiat("usd")) ?? 0
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

export const usePortfolioSymbolBalances = (balances: Balances) => {
  // group balances by token symbol
  // TODO: Move the association between a token on multiple chains into the backend / subsquid.
  // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
  // Also, we might want to separate testnet tokens from non-testnet tokens.
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
      .sort(sortSymbolBalancesBy("total"))
  }, [balances])

  const availableSymbolBalances = useMemo(() => {
    const available = symbolBalances
      .map(([symbol, balances]): [string, Balances] => [
        symbol,
        balances.find((b) => b.transferable.planck > 0n),
      ])
      .filter(([, balances]) => balances.count > 0)
      .sort(sortSymbolBalancesBy("available"))

    // only show zero balances in the popup when the selected account(s) have balances
    if (available.length > 0) return available

    return symbolBalances
      .map(([symbol, balances]): [string, Balances] => [
        symbol,
        balances.find((b) => b.total.planck === 0n),
      ])
      .filter(([, balances]) => balances.count > 0)
      .sort(sortSymbolBalancesBy("available"))
  }, [symbolBalances])

  const lockedSymbolBalances = useMemo(
    () =>
      symbolBalances
        .map(([symbol, balances]): [string, Balances] => [
          symbol,
          balances.find((b) => b.locked.planck > 0n || b.reserved.planck > 0n),
        ])
        .filter(([, balances]) => balances.count > 0)
        .sort(sortSymbolBalancesBy("locked")),
    [symbolBalances]
  )

  const { account, accounts } = useSelectedAccount()
  const { networkFilter } = usePortfolio()

  const hasEthereumAccount = useMemo(() => accounts.some((a) => a.type === "ethereum"), [accounts])

  // if specific account we have 2 rows minimum, if all accounts we have 4
  const skeletons = useMemo(() => {
    // in this case we don't know the number of min rows, balances should be already loaded anyway
    if (networkFilter) return symbolBalances.length ? 0 : 1

    // If no accounts then it means "all accounts", expect all default tokens (substrate + eth)
    // if account has a genesis hash then we expect only 1 chain
    // otherwise we expect default tokens for account type
    const expectedRows = (() => {
      if (!account)
        return (
          DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE.length +
          (hasEthereumAccount ? DEFAULT_PORTFOLIO_TOKENS_ETHEREUM.length : 0)
        )
      if (account.genesisHash) return 1
      if (account.type === "ethereum") return DEFAULT_PORTFOLIO_TOKENS_ETHEREUM.length
      return DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE.length
    })()

    return symbolBalances.length < expectedRows ? expectedRows - symbolBalances.length : 0
  }, [account, hasEthereumAccount, networkFilter, symbolBalances.length])

  return { symbolBalances, availableSymbolBalances, lockedSymbolBalances, skeletons }
}
