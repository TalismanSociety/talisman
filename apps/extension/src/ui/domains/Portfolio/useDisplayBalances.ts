import { atom, useAtomValue } from "jotai"
import { atomFamily } from "jotai/utils"
import { useMemo } from "react"

import { AccountJsonAny, Balance, Balances } from "@extension/core"
import {
  DEFAULT_PORTFOLIO_TOKENS_ETHEREUM,
  DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE,
} from "@extension/shared"
import { portfolioAccountAtom, portfolioAtom } from "@ui/atoms"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"

// TODO: default tokens should be controlled from chaindata
const shouldDisplayBalance = (account: AccountJsonAny | undefined, balances: Balances) => {
  const accountHasSomeBalance = balances.find({ address: account?.address }).sum.planck.total > 0n

  return (balance: Balance): boolean => {
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

export const portfolioDisplayBalancesAtomFamily = atomFamily(
  (filter: "all" | "network" | "search") =>
    atom((get) => {
      const { networkBalances, allBalances, searchBalances } = get(portfolioAtom)
      const account = get(portfolioAccountAtom)

      switch (filter) {
        case "all":
          return networkBalances.find(shouldDisplayBalance(account, allBalances))
        case "network":
          return networkBalances.find(shouldDisplayBalance(account, networkBalances))
        case "search":
          return searchBalances.find(shouldDisplayBalance(account, searchBalances))
      }
    })
)

/**
 * @deprecated use atoms
 */
export const useDisplayBalances = (balances: Balances) => {
  const { account } = useSelectedAccount()

  return useMemo(() => balances.find(shouldDisplayBalance(account, balances)), [account, balances])
}

export const usePortfolioDisplayBalances = (filter: "all" | "network") => {
  return useAtomValue(portfolioDisplayBalancesAtomFamily(filter))
}
