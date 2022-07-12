import { Balance, Balances } from "@core/domains/balances"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useMemo } from "react"

import { usePortfolio } from "../context"
import { useSelectedAccount } from "../SelectedAccountContext"

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

  const { account } = useSelectedAccount()
  const { networkFilter } = usePortfolio()

  // if specific account we have 2 rows minimum, if all accounts we have 4
  const skeletons = useMemo(() => {
    // in this case we don't know the number of min rows
    if (networkFilter) return 0

    // Expect at least dot/ksm or movr/glmr
    const expectedRows = account ? 2 : 4
    return symbolBalances.length < expectedRows ? expectedRows - symbolBalances.length : 0
  }, [account, networkFilter, symbolBalances.length])

  return { symbolBalances, skeletons }
}
