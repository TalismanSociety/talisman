import {
  DEFAULT_PORTFOLIO_TOKENS_ETHEREUM,
  DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE,
} from "@core/constants"
import { Balance, Balances } from "@core/domains/balances/types"
import { useMemo } from "react"

import { usePortfolio } from "../context"
import { useSelectedAccount } from "../SelectedAccountContext"

export const usePortfolioSymbolBalances = (balances: Balances) => {
  // group by token (symbol)
  // TODO: Move the association between a token on multiple chains into the backend / subsquid.
  // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
  // Also, we might want to separate testnet tokens from non-testnet tokens.
  const symbolBalances = useMemo(() => {
    const groupedByToken = balances.each.reduce((acc, b) => {
      if (!b.token) return acc
      const key = b.token.symbol
      if (acc[key]) acc[key].push(b)
      else acc[key] = [b]
      return acc
    }, {} as Record<string, Balance[]>)
    const balancesByToken = Object.entries(groupedByToken).reduce(
      (acc, [key, tokenBalances]) => ({
        ...acc,
        [key]: new Balances(tokenBalances),
      }),
      {} as Record<string, Balances>
    )
    return Object.entries(balancesByToken)
  }, [balances])

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
    let expectedRows = 0
    if (!account)
      expectedRows =
        DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE.length +
        (hasEthereumAccount ? DEFAULT_PORTFOLIO_TOKENS_ETHEREUM.length : 0)
    else if (account.genesisHash) expectedRows = 1
    else if (account.type === "ethereum") expectedRows = DEFAULT_PORTFOLIO_TOKENS_ETHEREUM.length
    else expectedRows = DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE.length

    return symbolBalances.length < expectedRows ? expectedRows - symbolBalances.length : 0
  }, [account, hasEthereumAccount, networkFilter, symbolBalances.length])

  return { symbolBalances, skeletons }
}
