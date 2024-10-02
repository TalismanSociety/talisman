import { usePortfolioNavigation } from "./usePortfolioNavigation"

/**
 * @deprecated use usePortfolioNavigation instead
 */
export const useSelectedAccount = () => {
  const { selectedAccount, selectedAccounts } = usePortfolioNavigation()

  return {
    accounts: selectedAccounts,
    account: selectedAccount ?? undefined,
  }
}
