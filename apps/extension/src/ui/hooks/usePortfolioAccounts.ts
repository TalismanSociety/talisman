import {
  accountsByCategoryAtomFamily,
  accountsCatalogAtom,
  balanceTotalsAtom,
  settingsAtomFamily,
} from "@ui/atoms"
import { atom, useAtomValue } from "jotai"

const portfolioAccountsAtom = atom(async (get) => {
  const [accounts, ownedAccounts, portfolioAccounts, catalog, currency, allBalanceTotals] =
    await Promise.all([
      get(accountsByCategoryAtomFamily("all")),
      get(accountsByCategoryAtomFamily("owned")),
      get(accountsByCategoryAtomFamily("portfolio")),
      get(accountsCatalogAtom),
      get(settingsAtomFamily("selectedCurrency")),
      get(balanceTotalsAtom),
    ])

  const balanceTotals = allBalanceTotals.filter((b) => b.currency === currency)

  const totalPerAddress = Object.fromEntries(balanceTotals.map((t) => [t.address, t.total]))
  const balanceTotalPerAccount = Object.fromEntries(
    accounts.map((a) => [a.address, totalPerAddress[a.address] ?? 0])
  )

  const portfolioTotal = portfolioAccounts.reduce(
    (total, acc) => total + balanceTotalPerAccount[acc.address] ?? 0,
    0
  )

  const ownedTotal = ownedAccounts.reduce(
    (total, acc) => total + balanceTotalPerAccount[acc.address] ?? 0,
    0
  )

  return {
    accounts,
    ownedAccounts,
    catalog,
    balanceTotals,
    currency,
    balanceTotalPerAccount,
    portfolioTotal,
    ownedTotal,
  }
})

export const usePortfolioAccounts = () => useAtomValue(portfolioAccountsAtom)
