import { Balance, Balances } from "@core/domains/balances"
import { useMemo } from "react"

import { usePortfolio } from "../context"
import { useSelectedAccount } from "../SelectedAccountContext"
import { useDisplayBalances } from "../useDisplayBalances"

export const usePortfolioSymbolBalances = (balances: Balances) => {
  const balancesToDisplay = useDisplayBalances(balances)

  // group by token (symbol)
  const symbolBalances = useMemo(() => {
    const groupedByToken = balancesToDisplay.sorted.reduce((acc, b) => {
      if (!b.token) return acc
      const key = b.token.symbol
      if (acc[key]) acc[key].push(b)
      else acc[key] = [b]
      return acc
    }, {} as Record<string, Balance[]>)
    const balancesByToken = Object.entries(groupedByToken).reduce(
      (acc, [key, balances]) => ({
        ...acc,
        [key]: new Balances(balances),
      }),
      {} as Record<string, Balances>
    )
    return Object.entries(balancesByToken)
  }, [balancesToDisplay.sorted])

  const { account, accounts } = useSelectedAccount()
  const { networkFilter } = usePortfolio()

  const hasEthereumAccount = useMemo(() => accounts.some((a) => a.type === "ethereum"), [accounts])

  // if specific account we have 2 rows minimum, if all accounts we have 4
  const skeletons = useMemo(() => {
    // in this case we don't know the number of min rows
    if (networkFilter) return 0

    // If no accounts then it means "all accounts", expect KSM/DOT/MOVR/GLMR (or only KSM/DOT if no eth account)
    // If account has a genesis hash then we expect only 1 chain
    // Otherwise we expect 2 chains (KSM+DOT or MOVR+GLMR)
    const expectedRows = account ? (account.genesisHash ? 1 : 2) : hasEthereumAccount ? 4 : 2
    return symbolBalances.length < expectedRows ? expectedRows - symbolBalances.length : 0
  }, [account, hasEthereumAccount, networkFilter, symbolBalances.length])

  return { symbolBalances, skeletons }
}
