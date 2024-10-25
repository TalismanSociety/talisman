import { bind } from "@react-rxjs/core"
import { isAddressEqual } from "@talismn/util"
import { useMemo } from "react"
import { combineLatest, map } from "rxjs"

import { AccountJsonAny, Balance, Balances } from "@extension/core"
import {
  DEFAULT_PORTFOLIO_TOKENS_ETHEREUM,
  DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE,
} from "@extension/shared"
import { portfolio$, portfolioSelectedAccounts$, usePortfolioSelectedAccounts } from "@ui/state"

// TODO: default tokens should be controlled from chaindata
const shouldDisplayBalance = (accounts: AccountJsonAny[] | undefined, balances: Balances) => {
  const accountHasSomeBalance =
    balances.find((b) => !accounts || accounts.some((a) => isAddressEqual(a.address, b.address)))
      .sum.planck.total > 0n

  return (balance: Balance): boolean => {
    const account = accounts?.find((a) => isAddressEqual(a.address, balance.address))
    // don't show substrate balances for ledger ethereum accounts (MOVR, GLMR etc exist on both sides)
    if (account?.type === "ethereum" && account.isHardware && !balance.evmNetworkId) return false

    const hasNonZeroBalance = balance.total.planck > 0
    if (hasNonZeroBalance) return true

    // only show DEFAULT_TOKENS if account has no balance
    if (!accountHasSomeBalance) {
      const isSubstrateAccount = account?.type !== "ethereum"
      const isSubstrateToken = DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE.includes(balance.tokenId)
      if (isSubstrateAccount && isSubstrateToken) return true

      const isEthereumAccount = !account || account?.type === "ethereum"
      const isEthereumToken = DEFAULT_PORTFOLIO_TOKENS_ETHEREUM.includes(balance.tokenId)
      if (isEthereumAccount && isEthereumToken) return true
    }

    if (account?.genesisHash && account.genesisHash === balance.chain?.genesisHash)
      return balance.token?.type === "substrate-native" || balance.total.planck > 0n

    return false
  }
}

export const [usePortfolioDisplayBalances, portfolioDisplayBalances$] = bind(
  (filter: "all" | "network" | "search") =>
    combineLatest([portfolio$, portfolioSelectedAccounts$]).pipe(
      map(([{ networkBalances, allBalances, searchBalances }, accounts]) => {
        switch (filter) {
          case "all":
            return networkBalances.find(shouldDisplayBalance(accounts, allBalances))
          case "network":
            return networkBalances.find(shouldDisplayBalance(accounts, networkBalances))
          case "search":
            return searchBalances.find(shouldDisplayBalance(accounts, searchBalances))
        }
      }),
    ),
)

/**
 * @deprecated use atoms
 */
export const useDisplayBalances = (balances: Balances) => {
  const accounts = usePortfolioSelectedAccounts()

  return useMemo(
    () => balances.find(shouldDisplayBalance(accounts, balances)),
    [accounts, balances],
  )
}
