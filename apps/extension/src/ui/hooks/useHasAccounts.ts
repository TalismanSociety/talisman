import { usePortfolioAccounts } from "./usePortfolioAccounts"

export const useHasAccounts = () => {
  const { accounts } = usePortfolioAccounts()
  return !!accounts.length
}
