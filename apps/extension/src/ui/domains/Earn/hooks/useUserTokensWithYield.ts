import { TokenId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useAccounts, useBalances, useIsBalanceInitializing } from "@ui/state"

import { getYieldxyzTokenAddress } from "../utils/tokenUtils"

export interface UserTokenWithYield {
  tokenId: TokenId
  symbol: string
  logoURI?: string
  networkId: string
  tokenAddress?: string
  totalBalance: number
  totalBalanceUsd: number
  accounts: Array<{
    address: string
    balance: number
    balanceUsd: number
  }>
}

/**
 * Hook to get user's tokens with non-zero balances for yield opportunities
 * Respects account/folder selection from URL params like the Assets tab
 */
export const useUserTokensWithYield = () => {
  const balances = useBalances()
  const isBalancesInitializing = useIsBalanceInitializing()
  // const [searchParams] = useSearchParams()
  const { selectedAccounts } = usePortfolioNavigation()
  // const { accounts: allAccounts, portfolioAccounts, catalog } = usePortfolioAccounts()
  const ownedAccounts = useAccounts("owned")

  // Get selected accounts from URL params, similar to usePortfolioNavigation
  // const selectedAccounts = useMemo(() => {
  //   const accountAddress = searchParams.get("account")
  //   const folderId = searchParams.get("folder")

  //   if (accountAddress) {
  //     const selectedAccount = allAccounts.find((acc) => isAddressEqual(acc.address, accountAddress))
  //     return selectedAccount ? [selectedAccount] : portfolioAccounts
  //   }

  //   if (folderId) {
  //     const selectedFolder =
  //       catalog.portfolio.find((folder) => folder.type === "folder" && folder.id === folderId) ||
  //       catalog.watched.find((folder) => folder.type === "folder" && folder.id === folderId)
  //     if (selectedFolder && selectedFolder.type === "folder") {
  //       return allAccounts.filter((acc) =>
  //         selectedFolder.tree.some((treeAcc) => isAddressEqual(acc.address, treeAcc.address)),
  //       )
  //     }
  //   }

  //   return portfolioAccounts
  // }, [allAccounts, portfolioAccounts, catalog, searchParams])

  // Get owned account addresses only - for "Earn on your assets" we only want owned accounts
  const ownedAddresses = useMemo(() => {
    return new Set(ownedAccounts.map((account) => account.address))
  }, [ownedAccounts])

  // Get tokens with non-zero balances
  const userTokens = useMemo(() => {
    const tokenMap = new Map<TokenId, UserTokenWithYield>()

    // Filter balances by selected accounts and owned addresses
    const relevantBalances = balances.each.filter((balance) => {
      // Only include balances from owned accounts for "Earn on your assets"
      if (!ownedAddresses.has(balance.address)) return false

      // Filter by selected accounts if any
      const selectedAddresses = new Set((selectedAccounts || []).map((a) => a.address))
      if (selectedAddresses.size > 0 && !selectedAddresses.has(balance.address)) return false

      // Only include transferable balances > 0
      return balance.transferable.planck > 0n
    })

    // Group by token and aggregate balances
    relevantBalances.forEach((balance) => {
      if (!balance.token) return

      const existing = tokenMap.get(balance.tokenId)
      const balanceUsd = parseFloat(balance.transferable.fiat("usd")?.toString() || "0")
      const balanceTokens = parseFloat(balance.transferable.tokens || "0")

      if (existing) {
        // Add to existing token
        existing.totalBalance += balanceTokens
        existing.totalBalanceUsd += balanceUsd
        existing.accounts.push({
          address: balance.address,
          balance: balanceTokens,
          balanceUsd,
        })
      } else {
        // Create new token entry
        tokenMap.set(balance.tokenId, {
          tokenId: balance.tokenId,
          symbol: balance.token.symbol,
          logoURI: balance.token.logo,
          networkId: balance.networkId,
          tokenAddress: getYieldxyzTokenAddress(balance.token) || undefined,
          totalBalance: balanceTokens,
          totalBalanceUsd: balanceUsd,
          accounts: [
            {
              address: balance.address,
              balance: balanceTokens,
              balanceUsd,
            },
          ],
        })
      }
    })

    // Convert to array and sort by USD value descending
    return Array.from(tokenMap.values()).sort((a, b) => b.totalBalanceUsd - a.totalBalanceUsd)
  }, [balances, selectedAccounts, ownedAddresses])

  return {
    userTokens,
    selectedAccounts,
    isLoading: isBalancesInitializing,
  }
}
